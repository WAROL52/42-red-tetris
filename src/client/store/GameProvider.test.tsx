// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { useStore, GameProvider, HEARTBEAT_MS } from './GameProvider.tsx'
import type { SocketBridge, BridgeHandlers } from './socketBridge.ts'

const captured: {
  handlers: BridgeHandlers | null
  emitted: Array<{ event: string; args: unknown[] }>
  closed: boolean
} = {
  handlers: null,
  emitted: [],
  closed: false,
}

function fakeFactory(): (u: string, handlers: BridgeHandlers) => SocketBridge {
  return (u, handlers) => {
    expect(u).toBe('')
    captured.handlers = handlers
    return {
      emit: (event, ...args) => {
        captured.emitted.push({ event, args })
      },
      close: () => {
        captured.closed = true
      },
    }
  }
}

function fire<K extends keyof BridgeHandlers>(event: K, ...args: Parameters<BridgeHandlers[K]>): void {
  expect(captured.handlers).not.toBeNull()
  const handler = captured.handlers?.[event]
  expect(handler).toBeDefined()
  ;(handler as (...params: unknown[]) => void)(...args)
}

function Probe(): React.JSX.Element {
  const { state, dispatch } = useStore()
  return (
    <div>
      <span data-testid="probe">
        {JSON.stringify({
          status: state.status,
          socketId: state.socketId,
          piece: state.engine.piece,
          over: state.engine.over,
          justLocked: state.justLocked,
          lastCleared: state.lastCleared,
        })}
      </span>
      <button onClick={() => dispatch({ type: 'GRAVITY_TICK' })}>tick</button>
    </div>
  )
}

describe('GameProvider', () => {
  beforeEach(() => {
    captured.handlers = null
    captured.emitted = []
    captured.closed = false
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('establishes the socket, joins the room and maps server events', () => {
    render(
      <GameProvider room="zen" playerName="alice" bridgeFactory={fakeFactory()}>
        <Probe />
      </GameProvider>,
    )

    expect(captured.emitted[0]).toEqual({ event: 'join', args: [{ room: 'zen', playerName: 'alice' }] })

    act(() => fire('onConnect', 's1'))
    expect(screen.getByTestId('probe').textContent).toContain('"socketId":"s1"')

    const playerAlice = {
      id: 's1',
      name: 'alice',
      isHost: true,
      eliminated: false,
      spectrum: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    }
    act(() =>
      fire('onGameStarted', {
        room: 'zen',
        round: 1,
        players: [playerAlice],
        queue: ['T', 'J', 'I'],
      }),
    )
    act(() => fire('onState', { room: 'zen', status: 'running', round: 1, players: [playerAlice] }))
    act(() => fire('onPlayerJoined', { room: 'zen', player: { id: 's2', name: 'bob', isHost: false, eliminated: false, spectrum: [0] } }))
    act(() => fire('onHost', { playerName: 'bob' }))
    act(() => fire('onSpectrum', { playerName: 'bob', spectrum: [1, 2, 3] }))
    act(() =>
      fire('onPiece', { type: 'T', index: 0, next: ['J', 'I', 'O'] }),
    )
    expect(screen.getByTestId('probe').textContent).toContain('"status":"running"')
    expect(screen.getByTestId('probe').textContent).toContain('"type":"T"')

    act(() => fire('onPenalty', { lines: 2 }))
    act(() => fire('onPlayerEliminated', { playerName: 'bob' }))
    act(() => fire('onPlayerLeft', { room: 'zen', playerName: 'bob' }))
    act(() => fire('onDisconnect'))
    act(() => fire('onError', { message: 'nope' }))
  })

  it('reports a lock with its spectrum and clears the report afterwards', () => {
    render(
      <GameProvider room="zen" playerName="alice" bridgeFactory={fakeFactory()}>
        <Probe />
      </GameProvider>,
    )
    act(() =>
      fire('onGameStarted', {
        room: 'zen',
        round: 1,
        players: [
          { id: 's1', name: 'alice', isHost: true, eliminated: false, spectrum: [0] },
        ],
        queue: ['T', 'J', 'I'],
      }),
    )
    act(() =>
      fire('onPiece', { type: 'I', index: 0, next: ['J', 'I', 'O'] }),
    )

    for (let i = 0; i < 25 && !captured.emitted.some((e) => e.event === 'lock'); i++) {
      act(() => screen.getByText('tick').click())
    }
    act(() => {})
    const lockEmit = captured.emitted.find((e) => e.event === 'lock')
    expect(lockEmit).toBeDefined()
    expect(lockEmit!.args[0]).toEqual({ spectrum: expect.any(Array) })
    const probe = JSON.parse(screen.getByTestId('probe').textContent as string)
    expect(probe.piece).toBeNull()
    expect(probe.justLocked).toBe(false)
  })

  it('emits top-out once when the engine is over and emits heartbeats when the spectrum changes', () => {
    render(
      <GameProvider room="zen" playerName="alice" bridgeFactory={fakeFactory()}>
        <Probe />
      </GameProvider>,
    )
    act(() =>
      fire('onGameStarted', {
        room: 'zen',
        round: 1,
        players: [
          { id: 's1', name: 'alice', isHost: true, eliminated: false, spectrum: [0] },
        ],
        queue: ['T', 'J', 'I'],
      }),
    )
    act(() =>
      fire('onPiece', { type: 'I', index: 0, next: ['J', 'I', 'O'] }),
    )
    act(() => vi.advanceTimersByTime(HEARTBEAT_MS))
    expect(captured.emitted.some((e) => e.event === 'spectrumHeartbeat')).toBe(true)

    act(() =>
      fire('onPenalty', { lines: 22 }),
    )
    act(() =>
      fire('onPiece', { type: 'T', index: 1, next: ['J', 'I', 'O'] }),
    )
    expect(JSON.parse(screen.getByTestId('probe').textContent as string).over).toBe(true)
    act(() => {})
    expect(captured.emitted.some((e) => e.event === 'topOut')).toBe(true)
  })

  it('closes the bridge on unmount', () => {
    const { unmount } = render(
      <GameProvider room="zen" playerName="alice" bridgeFactory={fakeFactory()}>
        <Probe />
      </GameProvider>,
    )
    unmount()
    expect(captured.closed).toBe(true)
  })
})