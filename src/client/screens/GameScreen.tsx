import { Navigate, useParams } from 'react-router-dom'
import { GameProvider, useStore } from '../store/GameProvider.tsx'
import { GameSession } from '../GameSession.tsx'
import { BoardView } from '../components/BoardView.tsx'
import { SpectrumView } from '../components/SpectrumView.tsx'
import { QueueNext } from '../components/QueueNext.tsx'

function StatusBanner() {
  const { state } = useStore()
  if (state.status === 'waiting') {
    return (
      <div className="banner">
        {state.players.length === 0 ? 'joining…' : 'waiting for the host to start'}
      </div>
    )
  }
  if (state.status === 'finished') {
    const words =
      state.winner === null ? 'game over' : state.winner === state.playerName ? 'you win' : `${state.winner} wins`
    return <div className="banner">{words}</div>
  }
  if (state.engine.over && state.eliminated) {
    return <div className="banner">tops out</div>
  }
  return null
}

function HostControls() {
  const { state, send } = useStore()
  const self = state.players.find((p) => p.id === state.socketId)
  if (self?.isHost !== true) {
    return null
  }
  if (state.status === 'waiting') {
    return (
      <button type="button" onClick={() => send('start')} disabled={state.players.length === 0}>
        start
      </button>
    )
  }
  if (state.status === 'finished') {
    return (
      <button type="button" onClick={() => send('restart')}>
        next round
      </button>
    )
  }
  return null
}

function Lobby() {
  const { state } = useStore()
  return (
    <div className="lobby">
      <div className="round">
        {state.room} — round {state.round}
      </div>
      <div className="players">
        {state.players.map((p) => (
          <span className={p.id === state.socketId ? 'player self' : 'player'} key={p.id}>
            {p.name}
            {p.isHost ? ' (host)' : ''}
          </span>
        ))}
      </div>
      <StatusBanner />
      <HostControls />
    </div>
  )
}

function Field() {
  const { state } = useStore()
  return (
    <div className="field">
      <BoardView engine={state.engine} />
      <div className="side">
        <div className="queue-label">next</div>
        <QueueNext queue={state.queue} />
        <div className="moves-hint">
          <kbd>←</kbd>
          <kbd>→</kbd> move · <kbd>↑</kbd> rotate · <kbd>↓</kbd> soft drop ·{' '}
          <kbd>space</kbd> hard drop
        </div>
      </div>
    </div>
  )
}

function Opponents() {
  const { state } = useStore()
  const others = state.players.filter((p) => p.name !== state.playerName)
  
  return (
    <div className="opponents">
      {others.map((p) => (
        <SpectrumView
          name={p.name}
          spectrum={p.spectrum}
          eliminated={p.eliminated}
          id={p.id}
          key={p.id}
        />
      ))}
    </div>
  )
}

function GameScreenInner() {
  const { state } = useStore()
  if (state.playerName === null) {
    return <Navigate to="/" replace />
  }
  return (
    <div className="game">
      <Lobby />
      <div className="play">
        <Field />
        <Opponents />
      </div>
      <GameSession />
    </div>
  )
}

export function GameScreen() {
  const { room = '', playerName = '' } = useParams()
  if (!playerName.trim().length || !room.trim().length) {
    return <Navigate to="/" replace />
  }
  const cleanName = decodeURIComponent(playerName)
  const cleanRoom = decodeURIComponent(room)
  return (
    <GameProvider room={cleanRoom} playerName={cleanName}>
      <GameScreenInner />
    </GameProvider>
  )
}