import { describe, it, expect } from 'vitest'
import type { PieceKind, MoveAction } from '../../shared/protocol.ts'
import {
  createGame,
  spawn,
  tick,
  move,
  rotate,
  softDrop,
  hardDrop,
  clearLines,
  spectrum,
  isTopOut,
  isGameOver,
  makeGarbageRow,
  applyGarbage,
  applyAction,
  minos,
  COLS,
  TOTAL_ROWS,
  BUFFER_ROWS,
  VISIBLE_ROWS,
  type Cell,
  type GameState,
} from './engine.ts'
import { mulberry32, shuffle } from './seed.ts'

const M = 'I'

function makeBoard(rows: readonly string[]): Cell[][] {
  const board: Cell[][] = Array.from({ length: TOTAL_ROWS }, () => new Array<Cell>(COLS).fill(null))
  for (let vi = 0; vi < rows.length; vi++) {
    const row = rows[vi]!
    const ir = TOTAL_ROWS - 1 - vi
    for (let c = 0; c < COLS; c++) {
      board[ir]![c] = row[c] === '#' ? M : null
    }
  }
  return board
}

function withBoard(state: GameState, board: Cell[][]): GameState {
  return { ...state, board }
}

function pieceAt(state: GameState) {
  const p = state.piece!
  return { type: p.type, state: p.state, x: p.x, y: p.y, grounded: p.grounded }
}

const SPAWN_MINOS: Record<PieceKind, Array<[number, number]>> = {
  I: [[1, 0], [1, 1], [1, 2], [1, 3]],
  O: [[0, 0], [0, 1], [1, 0], [1, 1]],
  T: [[0, 1], [1, 0], [1, 1], [1, 2]],
  S: [[0, 1], [0, 2], [1, 0], [1, 1]],
  Z: [[0, 0], [0, 1], [1, 1], [1, 2]],
  J: [[0, 0], [1, 0], [1, 1], [1, 2]],
  L: [[0, 2], [1, 0], [1, 1], [1, 2]],
}

describe('spawn', () => {
  it('places JLSTZ boxes in buffer rows, cols 3..5, state 0', () => {
    for (const type of ['T', 'S', 'Z', 'J', 'L'] as PieceKind[]) {
      const s = spawn(createGame(), type)
      expect(s.piece).not.toBeNull()
      expect(pieceAt(s)).toEqual({ type, state: 0, x: 3, y: 0, grounded: false })
      expect(minos(type, 0).map((m) => [m.r, m.c])).toEqual(SPAWN_MINOS[type])
    }
  })

  it('spawns I at cols 3..6 and O at cols 4..5', () => {
    expect(pieceAt(spawn(createGame(), 'I'))).toEqual({ type: 'I', state: 0, x: 3, y: 0, grounded: false })
    expect(pieceAt(spawn(createGame(), 'O'))).toEqual({ type: 'O', state: 0, x: 4, y: 0, grounded: false })
  })

  it('returns over on spawn collision (top-out)', () => {
    const full = createGame()
    full.board = makeBoard(Array.from({ length: VISIBLE_ROWS }, () => '##########'))
    full.board[0] = full.board[0]!.map(() => M)
    full.board[1] = full.board[1]!.map(() => M)
    const s = spawn(full, 'T')
    expect(s.piece).toBeNull()
    expect(isTopOut(s)).toBe(true)
    expect(isGameOver(s)).toBe(true)
  })
})

describe('gravity & lock', () => {
  it('tick moves the piece down one cell', () => {
    let s = spawn(createGame(), 'I')
    expect(pieceAt(s).y).toBe(0)
    s = tick(s)
    expect(pieceAt(s).y).toBe(1)
    expect(pieceAt(s).grounded).toBe(false)
  })

  it('one-frame lock: grounds on contact, locks on the next tick', () => {
    const s0 = withBoard(createGame(), makeBoard(['##########']))
    let s = spawn(s0, 'O')
    while (!s.piece!.grounded) {
      s = tick(s)
    }
    expect(s.piece).not.toBeNull()
    s = tick(s)
    expect(s.piece).toBeNull()
  })

  it('locks and paints the piece onto the board', () => {
    const s0 = withBoard(createGame(), makeBoard(['##########']))
    let s = spawn(s0, 'O')
    while (s.piece !== null) {
      s = tick(s)
    }
    const filled = s.board
      .slice(BUFFER_ROWS)
      .flat()
      .filter((c) => c !== null)
    expect(filled.length).toBe(14)
  })
})

describe('move', () => {
  it('moves left and right, and stops at the walls', () => {
    let s = spawn(createGame(), 'T')
    s = move(s, 'left')
    expect(pieceAt(s).x).toBe(2)
    for (let i = 0; i < 20; i++) {
      s = move(s, 'left')
    }
    expect(pieceAt(s).x).toBeLessThanOrEqual(0)
    const left = pieceAt(s).x
    for (let i = 0; i < 20; i++) {
      s = move(s, 'right')
    }
    expect(pieceAt(s).x).toBeGreaterThan(left)
    const right = pieceAt(s).x
    for (let i = 0; i < 20; i++) {
      s = move(s, 'right')
    }
    expect(pieceAt(s).x).toBe(right)
  })
})

describe('rotate (SRS)', () => {
  it('rotates clockwise in open field', () => {
    const s = rotate(spawn(createGame(), 'T'))
    expect(s.piece!.state).toBe(1)
    expect(s.piece!.x).toBe(3)
    expect(s.piece!.y).toBe(0)
  })

  it('O rotates in place (identity)', () => {
    let s = spawn(createGame(), 'O')
    const before = pieceAt(s)
    for (let i = 0; i < 4; i++) {
      s = rotate(s)
    }
    expect(pieceAt(s)).toEqual(before)
  })

  it('kicks left when the naive rotation collides (0->1, kick test4 (-1,0))', () => {
    const s0 = withBoard(createGame(), makeBoard(['          ', '          ', '          ', '          ', '          ', '          ', '          ', '          ', '          ', '          ', '          ', '          ', '          ', '          ', '          ', '          ', '          ', '          ', '          ', '    #     ']))
    let s = spawn(s0, 'T')
    s = rotate(s)
    expect(s.piece!.state).toBe(1)
    expect(s.piece!.x).toBe(2)
    expect(s.piece!.y).toBe(0)
  })

  it('leaves the piece unchanged when no kick fits', () => {
    const s0 = withBoard(
      createGame(),
      makeBoard([...Array.from({ length: 19 }, () => '          '), '##########']),
    )
    let s = spawn(s0, 'J')
    const before = pieceAt(s)
    s = rotate(s)
    expect(pieceAt(s).state).toBe(before.state)
    expect(pieceAt(s).x).toBe(before.x)
    expect(pieceAt(s).y).toBe(before.y)
  })

  it('cycles through all four states', () => {
    let s = spawn(createGame(), 'T')
    for (let i = 1; i <= 4; i++) {
      s = rotate(s)
      expect(s.piece!.state).toBe(i % 4)
    }
  })
})

describe('soft drop & hard drop', () => {
  it('soft drop moves down one cell', () => {
    const s = softDrop(spawn(createGame(), 'T'))
    expect(s.piece!.y).toBe(1)
  })

  it('hard drop sinks to the pile and locks instantly', () => {
    const s0 = withBoard(createGame(), makeBoard(['##########']))
    const s = hardDrop(spawn(s0, 'I'))
    expect(s.piece).toBeNull()
    const filled = s.board.slice(BUFFER_ROWS).flat().filter((c) => c !== null)
    expect(filled.length).toBe(14)
  })
})

describe('clearLines', () => {
  it('clears a single completed line and drops the stack', () => {
    const s0 = withBoard(createGame(), makeBoard(['   ####    ', '###    ###', '#         ']))
    let s = spawn(s0, 'I')
    s = hardDrop(s)
    const { state, cleared } = clearLines(s)
    expect(cleared).toBe(1)
    expect(state.board[20]![0]).toBe(M)
    const rest = state.board.slice(BUFFER_ROWS).filter((row) => row.some((c) => c !== null))
    expect(rest.length).toBe(2)
  })

  it('counts double and tetris clears', () => {
    const s0 = withBoard(createGame(), makeBoard(['##########', '##########']))
    let s = spawn(s0, 'I')
    s = hardDrop(s)
    expect(clearLines(s).cleared).toBe(2)

    const s1 = withBoard(createGame(), makeBoard(['##########', '##########', '##########', '##########']))
    let s2 = spawn(s1, 'I')
    s2 = hardDrop(s2)
    expect(clearLines(s2).cleared).toBe(4)
  })

  it('reports zero when no line is complete', () => {
    const s0 = withBoard(createGame(), makeBoard(['#         ', '#         ']))
    let s = spawn(s0, 'I')
    s = hardDrop(s)
    const r = clearLines(s)
    expect(r.cleared).toBe(0)
    expect(r.state.board).toEqual(s.board)
  })
})

describe('spectrum', () => {
  it('returns all zeros on an empty field (visible only)', () => {
    expect(spectrum(createGame())).toEqual(new Array<number>(COLS).fill(0))
  })

  it('measures per-column heights over the visible region only', () => {
    const s0 = withBoard(createGame(), makeBoard(['#         ', '##        ']))
    let s = spawn(s0, 'I')
    s = hardDrop(s)
    const sp = spectrum(s)
    expect(sp).toHaveLength(COLS)
    expect(sp[0]).toBe(2)
    expect(sp[1]).toBe(2)
    expect(sp[2]).toBe(0)
  })

  it('ignores buffer rows', () => {
    const s0 = withBoard(createGame(), makeBoard(['#         ']))
    const b = s0.board
    b[0]![3] = M
    const sp = spectrum(withBoard(createGame(), b))
    expect(sp[0]).toBe(1)
    expect(sp[3]).toBe(0)
    expect(sp).toHaveLength(COLS)
  })

  it('caps heights at 20', () => {
    const s0 = withBoard(createGame(), makeBoard(Array.from({ length: 20 }, () => '#         ')))
    const sp = spectrum(s0)
    expect(sp[0]).toBe(VISIBLE_ROWS)
  })
})

describe('garbage', () => {
  it('makeGarbageRow produces exactly one hole', () => {
    const rng = mulberry32(42)
    for (let i = 0; i < 50; i++) {
      const row = makeGarbageRow(rng)
      expect(row).toHaveLength(COLS)
      const holes = row.filter((filled) => !filled).length
      expect(holes).toBe(1)
    }
  })

  it('applyGarbage with no rows is a no-op', () => {
    const s0 = withBoard(createGame(), makeBoard(['#         ']))
    const s = applyGarbage(s0, [])
    expect(s.board).toEqual(s0.board)
  })

  it('inserts rows at the bottom, pushes the stack up, and overflow is dropped', () => {
    const rng = () => 0.5
    const s0 = withBoard(createGame(), makeBoard(['#         ', '#         ', '#         ']))
    let s = spawn(s0, 'O')
    s = applyGarbage(s, [makeGarbageRow(rng), makeGarbageRow(rng)])
    expect(s.piece).toBeNull()
    const garbageRows = s.board.slice(TOTAL_ROWS - 2)
    for (const row of garbageRows) {
      expect(row.filter((c) => c === null)).toHaveLength(1)
      expect(row.filter((c) => c !== null)).toHaveLength(9)
    }
    expect(s.board[17]![0]).toBe(M)
    expect(s.board[18]![0]).toBe(M)
    expect(s.board[19]![0]).toBe(M)
    expect(s.board[16]![0]).toBeNull()
  })

  it('a full stack top-outs the active piece and drops the overflow', () => {
    const rng = () => 0.5
    const s0 = withBoard(createGame(), makeBoard(Array.from({ length: 20 }, () => '#         ')))
    let s = spawn(s0, 'O')
    s = applyGarbage(s, [makeGarbageRow(rng), makeGarbageRow(rng), makeGarbageRow(rng)])
    expect(s.piece).toBeNull()
    let column = 0
    for (let r = 0; r < TOTAL_ROWS; r++) {
      if (s.board[r]![0] !== null) {
        column++
      }
    }
    expect(column).toBe(19 + 3)
    expect(s.board[0]![4]).toBeNull()
    expect(s.board[1]![4]).toBeNull()
  })
})

describe('seed', () => {
  it('same seed reproduces the same sequence', () => {
    const a = mulberry32(7)
    const b = mulberry32(7)
    const as = Array.from({ length: 100 }, () => a())
    const bs = Array.from({ length: 100 }, () => b())
    expect(as).toEqual(bs)
  })

  it('bag is a full permutation of the seven pieces', () => {
    const rng = mulberry32(3)
    const pieces: PieceKind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
    const draw = shuffle(pieces, rng)
    expect([...draw].sort()).toEqual([...pieces].sort())
    expect(new Set(draw).size).toBe(7)
  })
})

describe('applyAction', () => {
  it('maps each move action to the engine move', () => {
    const source = spawn(createGame(), 'I')
    const actions: MoveAction[] = ['left', 'right', 'rotate', 'rotate', 'rotate', 'rotate', 'down', 'harddrop']
    let s = source
    for (const action of actions) {
      s = applyAction(s, action)
    }
    expect(s.piece).toBeNull()
  })
})