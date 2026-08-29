// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { RootState } from '../store/reducer.ts'
import { initialState, reducer, type Action } from '../store/reducer.ts'
import { GameScreen } from './GameScreen.tsx'

const storeRef = vi.hoisted(() => ({
  state: null as unknown as RootState,
  dispatch: vi.fn(),
  send: vi.fn(),
}))

vi.mock('../store/GameProvider.tsx', () => ({
  GameProvider: ({ children }: { children: ReactNode }) => children,
  useStore: () => storeRef,
  HEARTBEAT_MS: 2000,
}))

function alice() {
  return { id: 's1', name: 'alice', isHost: true, eliminated: false, spectrum: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
}

function run(state: RootState, action: Action): RootState {
  return reducer(state, action)
}

function renderGame() {
  return render(
    <MemoryRouter initialEntries={['/zen/alice']}>
      <Routes>
        <Route path="/:room/:playerName" element={<GameScreen />} />
        <Route path="/" element={<div>landing</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('GameScreen', () => {
  beforeEach(() => {
    storeRef.dispatch.mockClear()
    storeRef.send.mockClear()
    storeRef.state = initialState('zen', 'alice')
  })

  afterEach(() => {
    cleanup()
  })

  it('shows the waiting lobby for the host and starts the round', () => {
    storeRef.state = run(storeRef.state, { type: 'SOCKET_CONNECTED', id: 's1' })
    storeRef.state = run(storeRef.state, {
      type: 'ROOM_STATE',
      payload: { room: 'zen', status: 'waiting', round: 0, players: [alice()] },
    })
    renderGame()
    expect(screen.getByText('waiting for the host to start')).toBeDefined()
    expect(screen.getByText('zen — round 0')).toBeDefined()
    expect(screen.getByText('alice (host)')).toBeDefined()
    fireEvent.click(screen.getByText('start'))
    expect(storeRef.send).toHaveBeenCalledWith('start')
  })

  it('runs the field with the next queue and keyboard moves', () => {
    storeRef.state = run(storeRef.state, { type: 'SOCKET_CONNECTED', id: 's1' })
    storeRef.state = run(storeRef.state, {
      type: 'ROOM_STATE',
      payload: { room: 'zen', status: 'running', round: 1, players: [alice()] },
    })
    storeRef.state = run(storeRef.state, {
      type: 'GAME_STARTED',
      payload: { round: 1, players: [alice()], queue: ['T', 'J', 'I'] },
    })
    storeRef.state = run(storeRef.state, { type: 'PIECE', payload: { type: 'T', index: 0, next: ['J', 'I', 'O'] } })
    renderGame()

    expect(screen.getByText('zen — round 1')).toBeDefined()
    expect(screen.getByText('next')).toBeDefined()
    expect(screen.getByLabelText('J next')).toBeDefined()
    expect(screen.getByLabelText('O next')).toBeDefined()
    const board = screen.getByRole('grid')
    expect(board.querySelectorAll('[data-cell]').length).toBeGreaterThan(40)

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(storeRef.dispatch).toHaveBeenCalledWith({
      type: 'LOCAL_ACTION',
      payload: { action: 'left' },
    })
    fireEvent.keyDown(window, { key: ' ' })
    expect(storeRef.dispatch).toHaveBeenCalledWith({
      type: 'LOCAL_ACTION',
      payload: { action: 'harddrop' },
    })
  })

  it('declares a win and offers a restart', () => {
    storeRef.state = run(storeRef.state, { type: 'SOCKET_CONNECTED', id: 's1' })
    storeRef.state = run(storeRef.state, {
      type: 'ROOM_STATE',
      payload: { room: 'zen', status: 'finished', round: 0, players: [alice()] },
    })
    storeRef.state = run(storeRef.state, {
      type: 'GAME_OVER',
      payload: { winner: 'alice' },
    })
    renderGame()
    expect(screen.getByText('you win')).toBeDefined()
    fireEvent.click(screen.getByText('next round'))
    expect(storeRef.send).toHaveBeenCalledWith('restart')
  })

  it('redirects to the landing screen when the name is missing', () => {
    storeRef.state = run(storeRef.state, { type: 'SOCKET_CONNECTED', id: 's1' })
    render(
      <MemoryRouter initialEntries={['/zen/%20']}>
        <Routes>
          <Route path="/:room/:playerName" element={<GameScreen />} />
          <Route path="/" element={<div>landing</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('landing')).toBeDefined()
  })
})