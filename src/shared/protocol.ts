export type PieceKind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'

export type MoveAction = 'left' | 'right' | 'rotate' | 'down' | 'harddrop'

export type GameStatus = 'waiting' | 'running' | 'finished'

export const HORIZON_LENGTH = 3
export type PenaltyMode = 'byHole' | 'byDisableLines' | 'byNewFromBottom'

/** Presentation colors; the server never needs them. */
export const PIECE_COLORS: Record<PieceKind, string> = {
  I: '#3ec2dd',
  O: '#f6e05e',
  T: '#9d6cff',
  S: '#54d17a',
  Z: '#f0655a',
  J: '#5a7bf0',
  L: '#f0a33e',
}

export const GARBAGE_COLOR = '#57534e'

export interface PlayerPublic {
  /** socket id — used as the React key and stable identity. */
  id: string
  name: string
  isHost: boolean
  eliminated: boolean
  spectrum: number[]
}

export interface RoomState {
  room: string
  status: GameStatus
  round: number
  players: PlayerPublic[]
  penaltyMode?: PenaltyMode
}

export interface ClientToServerEvents {
  join: (payload: { room: string; playerName: string }) => void
  leave: () => void
  start: (payload?: { penaltyMode?: PenaltyMode }) => void
  restart: () => void
  move: (payload: { action: MoveAction }) => void
  lock: (payload: { spectrum: number[] }) => void
  linesCleared: (payload: { count: number; spectrum: number[] }) => void
  spectrumHeartbeat: (payload: { spectrum: number[] }) => void
  topOut: () => void
}

export interface ServerToClientEvents {
  state: (payload: RoomState) => void
  playerJoined: (payload: { room: string; player: PlayerPublic }) => void
  playerLeft: (payload: { room: string; playerName: string }) => void
  playerEliminated: (payload: { playerName: string }) => void
  host: (payload: { playerName: string }) => void
  gameStarted: (payload: { room: string; round: number; players: PlayerPublic[]; queue: PieceKind[]; penaltyMode?: PenaltyMode }) => void
  piece: (payload: { type: PieceKind; index: number; next: PieceKind[] }) => void
  spectrum: (payload: { playerName: string; spectrum: number[] }) => void
  penalty: (payload: { lines: number }) => void
  gameOver: (payload: { winner: string | null }) => void
  error: (payload: { message: string }) => void
}