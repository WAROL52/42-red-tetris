import { PIECE_COLORS, type PieceKind } from '../../shared/protocol.ts'
import { SHAPES } from '../engine/engine.ts'

function MiniPiece({ type }: { type: PieceKind }) {
  const shape = SHAPES[type]![0]!
  return (
    <div className="mini-piece" aria-label={`${type} next`}>
      {shape.map((row, r) => (
        <div className="mini-row" key={r}>
          {row.map((filled, c) => (
            <div
              className="mini-cell"
              key={c}
              style={{ backgroundColor: filled ? PIECE_COLORS[type] : 'transparent' }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function QueueNext({ queue }: { queue: PieceKind[] }) {
  if (queue.length === 0) {
    return null
  }
  return (
    <div className="queue">
      {queue.map((type, i) => (
        <MiniPiece type={type} key={i} />
      ))}
    </div>
  )
}