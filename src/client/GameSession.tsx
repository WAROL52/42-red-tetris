import { useEffect, useRef } from 'react'
import type { MoveAction } from '../shared/protocol.ts'
import { useStore } from './store/GameProvider.tsx'

export const GRAVITY_MS = 500

const KEY_MOVES: Record<string, MoveAction> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'rotate',
  ArrowDown: 'down',
  ' ': 'harddrop',
}

export function GameSession() {
  const { state, dispatch } = useStore()
  const engineRef = useRef(state.engine)
  engineRef.current = state.engine
  const statusRef = useRef(state.status)
  statusRef.current = state.status

  useEffect(() => {
    if (state.status !== 'running') {
      return
    }
    let frame = 0
    let last = performance.now()
    let acc = 0
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop)
      acc += now - last
      last = now
      const engine = engineRef.current
      if (engine.piece === null || engine.over) {
        return
      }
      if (acc >= GRAVITY_MS) {
        acc %= GRAVITY_MS
        dispatch({ type: 'GRAVITY_TICK' })
      }
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [state.status, dispatch])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const action = KEY_MOVES[event.key]
      if (action === undefined) {
        return
      }
      event.preventDefault()
      const engine = engineRef.current
      if (statusRef.current !== 'running' || engine.over || engine.piece === null) {
        return
      }
      dispatch({ type: 'LOCAL_ACTION', payload: { action } })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch])

  return null
}