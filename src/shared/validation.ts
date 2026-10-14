import type { MoveAction, PieceKind, PenaltyMode } from './protocol.ts'
import { HORIZON_LENGTH } from './protocol.ts'

export const NAME_PATTERN = /^[\w-]{1,24}$/

export const FIELD_WIDTH = 10
export const MIN_HEIGHT = 0
export const MAX_HEIGHT = 20
export const MIN_CLEAR_COUNT = 1
export const MAX_CLEAR_COUNT = 4

export const ACTIONS: readonly MoveAction[] = [
  'left',
  'right',
  'rotate',
  'down',
  'harddrop',
] as const

const PIECES: readonly PieceKind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const
const PENALTY_MODES: readonly PenaltyMode[] = ['byHole', 'byDisableLines', 'byNewFromBottom'] as const

export function isValidName(value: string): boolean {
  return NAME_PATTERN.test(value.trim())
}

export function validateJoin(room: string, playerName: string): boolean {
  return isValidName(room) && isValidName(playerName)
}

export function isValidSpectrum(spectrum: number[]): boolean {
  if (spectrum.length !== FIELD_WIDTH) {
    return false
  }
  return spectrum.every((height) => height >= MIN_HEIGHT && height <= MAX_HEIGHT)
}

export function isValidClearCount(count: number): boolean {
  return count >= MIN_CLEAR_COUNT && count <= MAX_CLEAR_COUNT
}

export function isValidAction(action: string): action is MoveAction {
  return (ACTIONS as readonly string[]).includes(action)
}

export function isValidPieceIndex(index: number): boolean {
  return index >= 0
}

export function isValidPiece(type: string): type is PieceKind {
  return (PIECES as readonly string[]).includes(type)
}

export function isValidPenaltyMode(mode: unknown): mode is PenaltyMode {
  return (PENALTY_MODES as readonly string[]).includes(mode as string)
}

export function isValidHorizon(queue: PieceKind[]): boolean {
  return (
    queue.length === HORIZON_LENGTH && queue.every((type) => isValidPiece(type))
  )
}