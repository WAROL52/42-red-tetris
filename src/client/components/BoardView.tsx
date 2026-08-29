import { BUFFER_ROWS, COLS, TOTAL_ROWS, minos, type Cell, type GameState } from '../engine/engine.ts'
import { GARBAGE_COLOR, PIECE_COLORS, type PieceKind } from '../../shared/protocol.ts'

/** Cell grid of the 20 visible rows, with the falling piece painted in. */
export function visibleRows(engine: GameState): Cell[][] {
  const grid = engine.board.slice(BUFFER_ROWS).map((row) => row.slice())
  const piece = engine.piece
  if (piece !== null) {
    for (const { r, c } of minos(piece.type, piece.state)) {
      const wr = piece.y + r
      const wc = piece.x + c
      if (wr >= BUFFER_ROWS && wr < TOTAL_ROWS && wc >= 0 && wc < COLS) {
        grid[wr - BUFFER_ROWS]![wc] = piece.type
      }
    }
  }
  return grid
}

function cellColor(cell: Cell): string {
  if (cell === null) {
    return 'transparent'
  }
  if (cell === 'X') {
    return GARBAGE_COLOR
  }
  return PIECE_COLORS[cell as PieceKind]
}

interface Props {
  engine: GameState
}

export function BoardView({ engine }: Props) {
  const rows = visibleRows(engine)
  return (
    <div className="board" role="grid" aria-label="field">
      {rows.map((row, r) => (
        <div className="board-row" role="row" key={r}>
          {row.map((cell, c) => (
            <div
              className="cell"
              role="gridcell"
              data-cell={cell?.toString() ?? ''}
              key={`${r}-${c}`}
              style={{ backgroundColor: cellColor(cell) }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}