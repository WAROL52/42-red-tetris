import { createContext, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import { initialState, reducer, type Action, type RootState } from './reducer.ts'
import { createSocketBridge, type BridgeHandlers, type SocketBridge } from './socketBridge.ts'
import { spectrum as engineSpectrum } from '../engine/engine.ts'

export const HEARTBEAT_MS = 2000

export type BridgeFactory = (url: string, handlers: BridgeHandlers) => SocketBridge

export interface StoreApi {
  state: RootState
  dispatch: (action: Action) => void
  send: SocketBridge['emit']
}

const StoreContext = createContext<StoreApi | null>(null)

export function useStore(): StoreApi {
  const api = useContext(StoreContext)
  if (api === null) {
    throw new Error('useStore must be used inside <GameProvider>')
  }
  return api
}

interface Props {
  room: string
  playerName: string
  url?: string
  bridgeFactory?: BridgeFactory
  children: ReactNode
}

export function GameProvider({ room, playerName, url = '', bridgeFactory, children }: Props) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(room, playerName))
  const bridgeRef = useRef<SocketBridge | null>(null)
  const overEmittedRef = useRef(false)
  const engineRef = useRef(state.engine)
  engineRef.current = state.engine
  const lastSpectrumRef = useRef<number[]>([])

  const createBridge = bridgeFactory ?? createSocketBridge

  useEffect(() => {
    let cancelled = false
    const bridge = createBridge(url, {
      onConnect: (id) => dispatch({ type: 'SOCKET_CONNECTED', id }),
      onDisconnect: () => dispatch({ type: 'SOCKET_DISCONNECTED' }),
      onState: (payload) => dispatch({ type: 'ROOM_STATE', payload }),
      onPlayerJoined: (payload) => dispatch({ type: 'PLAYER_JOINED', payload }),
      onPlayerLeft: ({ playerName: name }) => dispatch({ type: 'PLAYER_LEFT', payload: { playerName: name } }),
      onPlayerEliminated: ({ playerName: name }) => dispatch({ type: 'PLAYER_ELIMINATED', payload: { playerName: name } }),
      onHost: ({ playerName: name }) => dispatch({ type: 'HOST_CHANGED', payload: { playerName: name } }),
      onGameStarted: (payload) => dispatch({ type: 'GAME_STARTED', payload }),
      onPiece: (payload) => dispatch({ type: 'PIECE', payload }),
      onSpectrum: ({ playerName: name, spectrum }) => dispatch({ type: 'PLAYER_SPECTRUM', payload: { playerName: name, spectrum } }),
      onPenalty: ({ lines }) => dispatch({ type: 'OPPONENT_LINES', payload: { count: lines } }),
      onGameOver: (payload) => dispatch({ type: 'GAME_OVER', payload }),
      onError: (e) => {
        console.log("[WS Error]:",e);
      },
    })
    bridgeRef.current = bridge
    if (!cancelled) {
      bridge.emit('join', { room, playerName })
    }
    return () => {
      cancelled = true
      bridge.close()
      bridgeRef.current = null
    }
  }, [room, playerName, url, createBridge])

  useEffect(() => {
    const bridge = bridgeRef.current
    if (bridge === null) {
      return
    }
    if (state.status !== 'running') {
      overEmittedRef.current = false
      return
    }
    if (state.justLocked) {
      const current = engineSpectrum(state.engine)
      bridge.emit('lock', { spectrum: current })
      if (state.lastCleared > 0) {
        bridge.emit('linesCleared', { count: state.lastCleared, spectrum: current })
      }
      dispatch({ type: 'REPORT_SENT' })
    }
    if (state.engine.over && !overEmittedRef.current) {
      overEmittedRef.current = true
      bridge.emit('topOut')
    }
  }, [state])

  useEffect(() => {
    const bridge = bridgeRef.current
    if (bridge === null || state.status !== 'running' || state.engine.over) {
      return
    }
    const id = window.setInterval(() => {
      const current = engineSpectrum(engineRef.current)
      const previous = lastSpectrumRef.current
      if (previous.length !== current.length || previous.some((v, i) => v !== current[i])) {
        lastSpectrumRef.current = current
        bridge.emit('spectrumHeartbeat', { spectrum: current })
      }
    }, HEARTBEAT_MS)
    return () => window.clearInterval(id)
  }, [state.status, state.engine.over])

  const send: SocketBridge['emit'] = (event, ...args) => {
    bridgeRef.current?.emit(event, ...args)
  }

  const value: StoreApi = {
    state,
    dispatch,
    send,
  }

  return <StoreContext.Provider value={value}>
    {children}</StoreContext.Provider>
}