import type { GameStatus, MoveAction, PieceKind, PlayerPublic, RoomState, PenaltyMode } from '../../shared/protocol.ts'
import {
  applyAction,
  applyPenaltyMode,
  clearLines,
  createGame,
  spawn,
  tick,
  type GameState,
} from '../engine/engine.ts'
import { mulberry32 } from '../engine/seed.ts'

export interface RootState {
  room: string | null
  playerName: string | null
  socketId: string | null
  connected: boolean
  status: GameStatus
  round: number
  players: PlayerPublic[]
  winner: string | null
  eliminated: boolean
  engine: GameState
  queue: PieceKind[]
  currentIndex: number
  garbageSeed: number
  garbageIncoming: number
  penaltyMode: PenaltyMode
  justLocked: boolean
  lastCleared: number
  penalityLines:number
}
 
export type Action =
  | { type: 'SOCKET_CONNECTED'; id: string }
  | { type: 'SOCKET_DISCONNECTED' }
  | { type: 'ROOM_STATE'; payload: RoomState }
  | { type: 'PLAYER_JOINED'; payload: { player: PlayerPublic } }
  | { type: 'PLAYER_LEFT'; payload: { playerName: string } }
  | { type: 'PLAYER_ELIMINATED'; payload: { playerName: string } }
  | { type: 'HOST_CHANGED'; payload: { playerName: string } }
  | { type: 'PLAYER_SPECTRUM'; payload: { playerName: string; spectrum: number[] } }
  | { type: 'GAME_STARTED'; payload: { round: number; players: PlayerPublic[]; queue: PieceKind[]; penaltyMode?: PenaltyMode } }
  | { type: 'PIECE'; payload: { type: PieceKind; index: number; next: PieceKind[] } }
  | { type: 'GRAVITY_TICK' }
  | { type: 'LOCAL_ACTION'; payload: { action: MoveAction } }
  | { type: 'OPPONENT_LINES'; payload: { count: number } }
  | { type: 'GAME_OVER'; payload: { winner: string | null } }
  | { type: 'REPORT_SENT' }

function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function initialState(room: string, playerName: string): RootState {
  return {
    room,
    playerName,
    socketId: null,
    connected: false,
    status: 'waiting',
    round: 0,
    players: [],
    winner: null,
    eliminated: false,
    engine: createGame(),
    queue: [],
    currentIndex: -1,
    garbageSeed: (hash(room + ':' + playerName) ^ 0x9e3779b9) >>> 0,
    garbageIncoming: 0,
    justLocked: false,
    lastCleared: 0,
	penalityLines:0,
    penaltyMode: 'byNewFromBottom'
  }
}

function mergePlayers(players: PlayerPublic[], incoming: PlayerPublic[]): PlayerPublic[] {
  const byId = new Map(players.map((p) => [p.id, p]))
  for (const p of incoming) {
    byId.set(p.id, p)
  }
  return [...byId.values()]
}

/**
 * A lock just happened: resolve completed lines and mark the report the
 * player must send to the server on the next opportunity.
 */
function resolveLock(state: RootState, engine: GameState): RootState {
  const result = clearLines(engine)
  return {
    ...state,
    engine: result.state,
    justLocked: true,
    lastCleared: result.cleared,
  }
}

export function reducer(state: RootState, action: Action): RootState {
  switch (action.type) {
    case 'SOCKET_CONNECTED':
      return { ...state, socketId: action.id, connected: true }

    case 'SOCKET_DISCONNECTED':
      return { ...state, connected: false }

    case 'ROOM_STATE':
      return {
        ...state,
        status: action.payload.status,
        round: action.payload.round,
        players: mergePlayers(state.players, action.payload.players),
        penaltyMode: action.payload.penaltyMode ?? state.penaltyMode,
      }

    case 'PLAYER_JOINED':
      return { ...state, players: mergePlayers(state.players, [action.payload.player]) }

    case 'PLAYER_LEFT':
      return {
        ...state,
        players: state.players.filter((p) => p.name !== action.payload.playerName),
      }

    case 'PLAYER_ELIMINATED':
      return {
        ...state,
        players: state.players.map((p) =>
          p.name === action.payload.playerName ? { ...p, eliminated: true } : p,
        ),
      }

    case 'HOST_CHANGED':
      return {
        ...state,
        players: state.players.map((p) => ({ ...p, isHost: p.name === action.payload.playerName })),
      }

    case 'PLAYER_SPECTRUM':
      return {
        ...state,
        players: state.players.map((p) =>
          p.name === action.payload.playerName ? { ...p, spectrum: action.payload.spectrum } : p,
        ),
      }

    case 'GAME_STARTED':
      return {
        ...state,
        status: 'running',
        round: action.payload.round,
        players: state.players.map((p) => ({ ...p, eliminated: false })),
        winner: null,
        eliminated: false,
        engine: createGame(),
        queue: action.payload.queue,
        currentIndex: 0,
        garbageIncoming: 0,
        justLocked: false,
        lastCleared: 0,
        penaltyMode: action.payload.penaltyMode ?? state.penaltyMode,
      }

    case 'PIECE':
      if (state.status !== 'running') {
        return state
      }
      return {
        ...state,
        engine: spawn(state.engine, action.payload.type),
        queue: action.payload.next,
        currentIndex: action.payload.index,
      }

    case 'GRAVITY_TICK': {
      if (state.status !== 'running' || state.engine.over || state.engine.piece === null) {
        return state
      }
      const engine = tick(state.engine)
      if (engine.piece !== null) {
        return { ...state, engine }
      }
      return resolveLock(state, engine)
    }

    case 'LOCAL_ACTION': {
      if (state.status !== 'running' || state.engine.over || state.engine.piece === null) {
        return state
      }
      const before = state.engine.piece
      const engine = applyAction(state.engine, action.payload.action)
      if (before !== null && engine.piece === null) {
        return resolveLock(state, engine)
      }
      return { ...state, engine }
    }

    case 'OPPONENT_LINES': {
      const lines = Math.max(0, action.payload.count)
      if (lines === 0) {
        return state
      }
      const rng = mulberry32(state.garbageSeed + state.garbageIncoming)
      return {
        ...state,
        engine: applyPenaltyMode(state.engine, state.penaltyMode, lines, rng),
        garbageIncoming: state.garbageIncoming + 1,
      }
    }

    case 'GAME_OVER':
      return {
        ...state,
        status: 'finished',
        winner: action.payload.winner,
        eliminated: action.payload.winner !== state.playerName,
      }

    case 'REPORT_SENT':
      return { ...state, justLocked: false, lastCleared: 0 }

    default:
      return state
  }
}