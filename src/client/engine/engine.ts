import type { PieceKind, MoveAction } from '../../shared/protocol.ts'
import type { Rng } from './seed.ts'

const GARBAGE = 'X'

export const COLS = 10
export const TOTAL_ROWS = 22
/** Rows of the internal board that are visible to the player. */
export const VISIBLE_ROWS = 20
/** Hidden buffer rows above the visible stack (pieces spawn here). */
export const BUFFER_ROWS = TOTAL_ROWS - VISIBLE_ROWS

export type Rotation = 0 | 1 | 2 | 3

/** A single parked cell: a piece kind, a garbage block, or null when empty. */
export type Cell = PieceKind | typeof GARBAGE | null

export interface FallingPiece {
  type: PieceKind
  state: Rotation
  /** Column of the left edge of the bounding box. */
  x: number
  /** Row of the top edge of the bounding box (internal coordinates). */
  y: number
  /** True once gravity can no longer move the piece down (locks next tick). */
  grounded: boolean
}

export interface GameState {
  board: Cell[][]
  piece: FallingPiece | null
  /** Top-out: spawned piece could not enter the field. */
  over: boolean
}

export interface KickOffset {
  dx: number
  dy: number
}

/* ------------------------------------------------------------------ */
/* Shapes — Guideline SRS spawn (state 0) orientations.                 */
/* ------------------------------------------------------------------ */

const SPAWN_SHAPES: Record<PieceKind, Array<Array<0 | 1>>> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
}

/** Rotate a square matrix 90° clockwise. */
function rotateCW(shape: boolean[][]): boolean[][] {
  const n = shape.length
  const out: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(false))
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      out[c]![n - 1 - r] = shape[r]![c]!
    }
  }
  return out
}

/** All four rotation states per piece (0 = spawn, 1 = CW, 2 = 180°, 3 = CCW). */
export const SHAPES: Record<PieceKind, boolean[][][]> = Object.fromEntries(
  Object.entries(SPAWN_SHAPES).map(([type, spawn]) => {
    const states: boolean[][][] = [spawn.map((row) => row.map((cell) => cell === 1))]
    for (let i = 1; i < 4; i++) {
      states.push(rotateCW(states[i - 1]!))
    }
    return [type, states]
  }),
) as Record<PieceKind, boolean[][][]>

/* ------------------------------------------------------------------ */
/* Wall kicks — from .scratch/red-tetris/research/srs.md (§2).        */
/* Positive dy is DOWN here (asset tables use positive y = UP).        */
/* ------------------------------------------------------------------ */

const JLSTZ_KICKS: Record<string, KickOffset[]> = {
  '0->1': [{ dx: 0, dy: 0 }, { dx: -1, dy: 0 }, { dx: -1, dy: -1 }, { dx: 0, dy: 2 }, { dx: -1, dy: 2 }],
  '1->2': [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 1, dy: 1 }, { dx: 0, dy: -2 }, { dx: 1, dy: -2 }],
  '2->3': [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 1, dy: -1 }, { dx: 0, dy: 2 }, { dx: 1, dy: 2 }],
  '3->0': [{ dx: 0, dy: 0 }, { dx: -1, dy: 0 }, { dx: -1, dy: 1 }, { dx: 0, dy: -2 }, { dx: -1, dy: -2 }],
}

const I_KICKS: Record<string, KickOffset[]> = {
  '0->1': [{ dx: 0, dy: 0 }, { dx: -2, dy: 0 }, { dx: 1, dy: 0 }, { dx: -2, dy: 1 }, { dx: 1, dy: -2 }],
  '1->2': [{ dx: 0, dy: 0 }, { dx: -1, dy: 0 }, { dx: 2, dy: 0 }, { dx: -1, dy: -2 }, { dx: 2, dy: 1 }],
  '2->3': [{ dx: 0, dy: 0 }, { dx: 2, dy: 0 }, { dx: -1, dy: 0 }, { dx: 2, dy: -1 }, { dx: -1, dy: 2 }],
  '3->0': [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: -2, dy: 0 }, { dx: 1, dy: 2 }, { dx: -2, dy: -1 }],
}

function kicksFor(type: PieceKind, from: Rotation, to: Rotation): KickOffset[] {
  const key = `${from}->${to}`
  if (type === 'I') {
    return I_KICKS[key] ?? [{ dx: 0, dy: 0 }]
  }
  if (type === 'O') {
    return [{ dx: 0, dy: 0 }]
  }
  return JLSTZ_KICKS[key] ?? [{ dx: 0, dy: 0 }]
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function emptyBoard(): Cell[][] {
  return Array.from({ length: TOTAL_ROWS }, () => new Array<PieceKind | null>(COLS).fill(null))
}

/** Local mino coordinates of a piece in a given rotation state. */
export function minos(type: PieceKind, state: Rotation): Array<{ r: number; c: number }> {
  const shape = SHAPES[type]![state]!
  const out: Array<{ r: number; c: number }> = []
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r]!.length; c++) {
      if (shape[r]![c]) {
        out.push({ r, c })
      }
    }
  }
  return out
}

function collides(board: Cell[][], type: PieceKind, state: Rotation, x: number, y: number): boolean {
  return minos(type, state).some(({ r, c }) => {
    const wx = x + c
    const wy = y + r
    return (
      wx < 0 ||
      wx >= COLS ||
      wy < 0 ||
      wy >= TOTAL_ROWS ||
      board[wy]![wx] !== null
    )
  })
}

export function createGame(): GameState {
  return { board: emptyBoard(), piece: null, over: false }
}

/** Spawn position: the state-0 box sits in the top buffer rows. */
export function spawnX(type: PieceKind): number {
  return type === 'O' ? 4 : 3
}

export function spawnY(): number {
  return 0
}

/* ------------------------------------------------------------------ */
/* Public engine API                                                   */
/* ------------------------------------------------------------------ */

/** Place a new piece of `type` in its spawn orientation. Top-outs here. */
export function spawn(state: GameState, type: PieceKind): GameState {
  if (state.piece !== null || state.over) {
    return state
  }
  const x = spawnX(type)
  const y = spawnY()
  if (collides(state.board, type, 0, x, y)) {
    return { ...state, piece: null, over: true }
  }
  return { ...state, piece: { type, state: 0, x, y, grounded: false } }
}

function movePiece(state: GameState, dx: number, dy: number, grounded: boolean): GameState {
  const p = state.piece
  if (p === null || state.over) {
    return state
  }
  if (grounded && collides(state.board, p.type, p.state, p.x + dx, p.y + dy)) {
    return { ...state, piece: { ...p, grounded: true } }
  }
  if (collides(state.board, p.type, p.state, p.x + dx, p.y + dy)) {
    return state
  }
  return { ...state, piece: { ...p, x: p.x + dx, y: p.y + dy } }
}

/** Horizontal shift (left/right). Legal on a grounded piece, before lock. */
export function move(state: GameState, action: 'left' | 'right'): GameState {
  return movePiece(state, action === 'left' ? -1 : 1, 0, false)
}

/** Clockwise rotation with SRS wall-kick resolution. */
export function rotate(state: GameState): GameState {
  const p = state.piece
  if (p === null || state.over) {
    return state
  }
  const to = (((p.state + 1) % 4) as Rotation)
  for (const kick of kicksFor(p.type, p.state, to)) {
    if (!collides(state.board, p.type, to, p.x + kick.dx, p.y + kick.dy)) {
      return { ...state, piece: { ...p, state: to, x: p.x + kick.dx, y: p.y + kick.dy } }
    }
  }
  return state
}

/** Gravity tick: move down one cell, or ground the piece for next tick. */
export function tick(state: GameState): GameState {
  const p = state.piece
  if (p === null || state.over) {
    return state
  }
  if (p.grounded) {
    return lockPiece(state)
  }
  if (!collides(state.board, p.type, p.state, p.x, p.y + 1)) {
    return { ...state, piece: { ...p, y: p.y + 1 } }
  }
  return { ...state, piece: { ...p, grounded: true } }
}

/** Soft drop: one cell down, non-locking (grounds on contact). */
export function softDrop(state: GameState): GameState {
  const p = state.piece
  if (p === null || state.over) {
    return state
  }
  if (!collides(state.board, p.type, p.state, p.x, p.y + 1)) {
    return { ...state, piece: { ...p, y: p.y + 1 } }
  }
  return { ...state, piece: { ...p, grounded: true } }
}

/** Hard drop: sink straight to the pile, then lock instantly. */
export function hardDrop(state: GameState): GameState {
  const p = state.piece
  if (p === null || state.over) {
    return state
  }
  let y = p.y
  while (y < TOTAL_ROWS && !collides(state.board, p.type, p.state, p.x, y + 1)) {
    y++
  }
  return lockPiece({ ...state, piece: { ...p, y, grounded: true } })
}

/** Merge the piece into the board. No line clearing here. */
function lockPiece(state: GameState): GameState {
  const p = state.piece
  if (p === null) {
    return state
  }
  const board = emptyBoard()
  for (let r = 0; r < TOTAL_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      board[r]![c] = state.board[r]![c]
    }
  }
  for (const { r, c } of minos(p.type, p.state)) {
    const wy = p.y + r
    const wx = p.x + c
    if (wy >= 0 && wy < TOTAL_ROWS && wx >= 0 && wx < COLS) {
      board[wy]![wx] = p.type
    }
  }
  return { board, piece: null, over: state.over }
}

function isFullRow(board: Cell[][], row: number): boolean {
  for (let c = 0; c < COLS; c++) {
    if (board[row]![c] === null) {
      return false
    }
  }
  return true
}

/**
 * Remove completed rows from the visible region and drop the stack.
 * Returns the number of lines cleared.
 */
export function clearLines(state: GameState): { state: GameState; cleared: number } {
  const full: number[] = []
  for (let r = BUFFER_ROWS; r < TOTAL_ROWS; r++) {
    if (isFullRow(state.board, r)) {
      full.push(r)
    }
  }
  if (full.length === 0) {
    return { state, cleared: 0 }
  }
  const removed = new Set(full)
  const board = emptyBoard()
  let shifted = 0
  for (let r = TOTAL_ROWS - 1; r >= 0; r--) {
    if (removed.has(r)) {
      shifted++
      continue
    }
    board[r + shifted] = state.board[r]!
  }
  return { state: { ...state, board }, cleared: full.length }
}

/** Heights per column over the VISIBLE region only (0..VISIBLE_ROWS). */
export function spectrum(state: GameState): number[] {
  const heights: number[] = new Array<number>(COLS).fill(0)
  for (let c = 0; c < COLS; c++) {
    for (let r = BUFFER_ROWS; r < TOTAL_ROWS; r++) {
      if (state.board[r]![c] !== null) {
        heights[c] = TOTAL_ROWS - r
        break
      }
    }
  }
  return heights
}

/** A top-out occurred — a spawned piece could not enter the field. */
export function isTopOut(state: GameState): boolean {
  return state.over
}

/** Neutral alias over the failure condition (caller decides what it means). */
export function isGameOver(state: GameState): boolean {
  return state.over
}

/* ------------------------------------------------------------------ */
/* Garbage                                                             */
/* ------------------------------------------------------------------ */

export type GarbageRow = boolean[]

/**
 * A 10-cell row that is "indestructible": exactly one hole at a
 * random column (never clearable). `rng` injectable for determinism.
 */
export function makeGarbageRow(rng: Rng): GarbageRow {
  const hole = Math.floor(rng() * COLS)
  const row: GarbageRow = new Array<boolean>(COLS).fill(true)
  row[hole] = false
  return row
}

/**
 * Dispose of incoming garbage: freeze the active piece first (forced lock),
 * then insert `rows` at the bottom and push the stack up; cells overflowing
 * above the buffer are dropped.
 */
export function applyGarbage(state: GameState, rows: GarbageRow[]): GameState {
  let merged = state
  if (merged.piece !== null) {
    merged = lockPiece(merged)
  }
  if (rows.length === 0) {
    return merged
  }
  const board = emptyBoard()
  for (let r = 0; r + rows.length < TOTAL_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      board[r]![c] = merged.board[r + rows.length]![c]
    }
  }
  for (let i = 0; i < rows.length; i++) {
    const target = TOTAL_ROWS - rows.length + i
    for (let c = 0; c < COLS; c++) {
      board[target]![c] = rows[i]![c] ? GARBAGE : null
    }
  }
  return { ...merged, board }
}

export function applyAction(state: GameState, action: MoveAction): GameState {
  switch (action) {
    case 'left':
      return move(state, 'left')
    case 'right':
      return move(state, 'right')
    case 'rotate':
      return rotate(state)
    case 'down':
      return softDrop(state)
    case 'harddrop':
      return hardDrop(state)
  }
}