import { describe, it, expect } from 'vitest'
import type { PieceKind, RoomState, PlayerPublic } from '../../shared/protocol.ts'
import { initialState, reducer, type RootState } from './reducer.ts'

function player(id: string, name: string, isHost = false, eliminated = false): PlayerPublic {
  return { id, name, isHost, eliminated, spectrum: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
}

function home(playerName = 'alice'): RootState {
  return {
    ...initialState('zen', playerName),
    socketId: 's1',
  }
}

function makeRunning(state: RootState): RootState {
  return reducer(state, {
    type: 'GAME_STARTED',
    payload: {
      round: 1,
      players: [player(state.socketId!, state.playerName!, true)],
      queue: ['T', 'J', 'I'],
    },
  })
}

function withPiece(state: RootState, type: PieceKind = 'T', index = 0): RootState {
  return reducer(state, { type: 'PIECE', payload: { type, index, next: ['J', 'I', 'O'] } })
}

describe('connection & room state', () => {
  it('starts in waiting, disconnected', () => {
    const s = initialState('zen', 'alice')
    expect(s.status).toBe('waiting')
    expect(s.connected).toBe(false)
    expect(s.engine.piece).toBeNull()
  })

  it('connects and stores the socket id', () => {
    const s = reducer(home(), { type: 'SOCKET_CONNECTED', id: 's9' })
    expect(s.socketId).toBe('s9')
    expect(s.connected).toBe(true)
  })

  it('absorbs a full room state', () => {
    const roomState: RoomState = {
      room: 'zen',
      status: 'running',
      round: 2,
      players: [player('a', 'bob', true), player('b', 'alice')],
    }
    const s = reducer(home(), { type: 'ROOM_STATE', payload: roomState })
    expect(s.status).toBe('running')
    expect(s.round).toBe(2)
    expect(s.players).toHaveLength(2)
  })

  it('tracks joins, leaves and host changes', () => {
    let s = home()
    s = reducer(s, { type: 'PLAYER_JOINED', payload: { player: player('a', 'bob', true) } })
    s = reducer(s, { type: 'PLAYER_JOINED', payload: { player: player('b', 'carol') } })
    expect(s.players).toHaveLength(2)

    s = reducer(s, { type: 'HOST_CHANGED', payload: { playerName: 'carol' } })
    expect(s.players.find((p) => p.name === 'carol')!.isHost).toBe(true)
    expect(s.players.find((p) => p.name === 'bob')!.isHost).toBe(false)

    s = reducer(s, { type: 'PLAYER_LEFT', payload: { playerName: 'bob' } })
    expect(s.players.map((p) => p.name)).toEqual(['carol'])
  })

  it('marks a player as eliminated', () => {
    let s = home()
    s = reducer(s, { type: 'PLAYER_JOINED', payload: { player: player('a', 'bob') } })
    s = reducer(s, { type: 'PLAYER_ELIMINATED', payload: { playerName: 'bob' } })
    expect(s.players.find((p) => p.name === 'bob')!.eliminated).toBe(true)
  })

  it('updates an opponent spectrum', () => {
    let s = home()
    s = reducer(s, { type: 'PLAYER_JOINED', payload: { player: player('a', 'bob') } })
    s = reducer(s, { type: 'PLAYER_SPECTRUM', payload: { playerName: 'bob', spectrum: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0] } })
    expect(s.players.find((p) => p.name === 'bob')!.spectrum[0]).toBe(1)
  })
})

describe('round lifecycle', () => {
  it('game started resets the engine and queue', () => {
    let s = makeRunning(home())
    s = withPiece(s, 'T')
    const before = s
    expect(s.engine.piece).not.toBeNull()
    expect(s.currentIndex).toBe(0)
    const started = reducer(s, {
      type: 'GAME_STARTED',
      payload: { round: 2, players: before.players, queue: ['O', 'S', 'Z'] },
    })
    expect(started.engine.piece).toBeNull()
    expect(started.round).toBe(2)
    expect(started.queue).toEqual(['O', 'S', 'Z'])
    expect(started.winner).toBeNull()
  })

  it('game over with a winner settles the match', () => {
    let s = makeRunning(home())
    s = reducer(s, { type: 'GAME_OVER', payload: { winner: 'bob' } })
    expect(s.status).toBe('finished')
    expect(s.winner).toBe('bob')
    expect(s.eliminated).toBe(true)
  })

  it('game over with my name means I won', () => {
    let s = makeRunning(home())
    s = reducer(s, { type: 'GAME_OVER', payload: { winner: 'alice' } })
    expect(s.eliminated).toBe(false)
  })

  it('game over with no winner (solo top-out) marks me eliminated', () => {
    let s = makeRunning(home())
    s = reducer(s, { type: 'GAME_OVER', payload: { winner: null } })
    expect(s.winner).toBeNull()
    expect(s.eliminated).toBe(true)
  })
})

describe('pieces', () => {
  it('spawns a piece from the server event and updates the queue', () => {
    let s = makeRunning(home())
    expect(s.engine.piece).toBeNull()
    s = withPiece(s, 'T', 3)
    expect(s.engine.piece).not.toBeNull()
    expect(s.currentIndex).toBe(3)
    expect(s.queue).toEqual(['J', 'I', 'O'])
  })

  it('ignores pieces while not running', () => {
    const s = reducer(home(), { type: 'PIECE', payload: { type: 'T', index: 0, next: [] } })
    expect(s.engine.piece).toBeNull()
  })

  it('tops out when the spawned piece cannot enter the field', () => {
    let s = makeRunning(home())
    s = reducer(s, { type: 'OPPONENT_LINES', payload: { count: 22 } })
    expect(s.engine.over).toBe(false)
    expect(s.engine.board[1]!.filter((c) => c === null)).toHaveLength(1)
    s = withPiece(s, 'I')
    expect(s.engine.over).toBe(true)
  })
})

describe('gravity & local actions', () => {
  it('gravity tick moves the piece down', () => {
    let s = withPiece(makeRunning(home()), 'T')
    const y0 = s.engine.piece!.y
    s = reducer(s, { type: 'GRAVITY_TICK' })
    expect(s.engine.piece!.y).toBe(y0 + 1)
  })

  it('gravity is a no-op without a piece', () => {
    const s = reducer(makeRunning(home()), { type: 'GRAVITY_TICK' })
    expect(s.engine.piece).toBeNull()
  })

  it('local actions apply to the engine', () => {
    let s = withPiece(makeRunning(home()), 'T')
    const x0 = s.engine.piece!.x
    s = reducer(s, { type: 'LOCAL_ACTION', payload: { action: 'left' } })
    expect(s.engine.piece!.x).toBe(x0 - 1)
    const st0 = s.engine.piece!.state
    s = reducer(s, { type: 'LOCAL_ACTION', payload: { action: 'rotate' } })
    expect(s.engine.piece!.state).toBe((st0 + 1) % 4)
  })

  it('a lock from gravity flags justLocked and clears completed lines', () => {
    let s = withPiece(makeRunning(home()), 'I')
    let landed = false
    for (let i = 0; i < 30 && !landed; i++) {
      s = reducer(s, { type: 'GRAVITY_TICK' })
      if (s.engine.piece === null) {
        landed = true
      }
    }
    expect(landed).toBe(true)
    expect(s.justLocked).toBe(true)
    expect(s.engine.piece).toBeNull()
  })

  it('report sent clears the pending report', () => {
    let s = withPiece(makeRunning(home()), 'I')
    for (let i = 0; i < 30 && s.engine.piece !== null; i++) {
      s = reducer(s, { type: 'GRAVITY_TICK' })
    }
    expect(s.justLocked).toBe(true)
    s = reducer(s, { type: 'REPORT_SENT' })
    expect(s.justLocked).toBe(false)
    expect(s.lastCleared).toBe(0)
  })

  it('hard drop locks immediately', () => {
    let s = withPiece(makeRunning(home()), 'I')
    s = reducer(s, { type: 'LOCAL_ACTION', payload: { action: 'harddrop' } })
    expect(s.engine.piece).toBeNull()
    expect(s.justLocked).toBe(true)
  })
})

describe('garbage', () => {
  it('applies the received penalty line count to the field', () => {
    let s = withPiece(makeRunning(home()), 'I')
    for (let i = 0; i < 30 && s.engine.piece !== null; i++) {
      s = reducer(s, { type: 'GRAVITY_TICK' })
    }
    s = reducer(s, { type: 'REPORT_SENT' })
    s = reducer(s, { type: 'OPPONENT_LINES', payload: { count: 3 } })
    const bottom = s.engine.board[s.engine.board.length - 3]
    expect(bottom).toBeDefined()
    const garbageRows = s.engine.board.slice(19)
    for (const row of garbageRows) {
      expect(row.filter((c) => c === null)).toHaveLength(1)
    }
    expect(s.garbageIncoming).toBe(1)
  })

  it('zero penalty lines send no garbage', () => {
    const before = withPiece(makeRunning(home()), 'I')
    const after = reducer(before, { type: 'OPPONENT_LINES', payload: { count: 0 } })
    expect(after.engine.board).toEqual(before.engine.board)
  })
})