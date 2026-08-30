import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/protocol.ts'

export interface BridgeHandlers {
  onConnect(id: string): void
  onDisconnect(): void
  onState(payload: Parameters<ServerToClientEvents['state']>[0]): void
  onPlayerJoined(payload: Parameters<ServerToClientEvents['playerJoined']>[0]): void
  onPlayerLeft(payload: Parameters<ServerToClientEvents['playerLeft']>[0]): void
  onPlayerEliminated(payload: Parameters<ServerToClientEvents['playerEliminated']>[0]): void
  onHost(payload: Parameters<ServerToClientEvents['host']>[0]): void
  onGameStarted(payload: Parameters<ServerToClientEvents['gameStarted']>[0]): void
  onPiece(payload: Parameters<ServerToClientEvents['piece']>[0]): void
  onSpectrum(payload: Parameters<ServerToClientEvents['spectrum']>[0]): void
  onPenalty(payload: Parameters<ServerToClientEvents['penalty']>[0]): void
  onGameOver(payload: Parameters<ServerToClientEvents['gameOver']>[0]): void
  onError(payload: Parameters<ServerToClientEvents['error']>[0]): void
}

export interface SocketBridge {
  emit<K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ): void
  close(): void
}

/** Impure socket adapter — the only place socket.io-client is touched. */
export function createSocketBridge(url: string, handlers: BridgeHandlers): SocketBridge {
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(url, {
    transports: ['websocket'],
  })

  socket.on('connect', () => handlers.onConnect(socket.id ?? ''))
  socket.on('disconnect', () => handlers.onDisconnect())
  socket.on('error', (payload) => handlers.onError(payload))
  socket.on('state', (payload) => handlers.onState(payload))
  socket.on('playerJoined', (payload) => handlers.onPlayerJoined(payload))
  socket.on('playerLeft', (payload) => handlers.onPlayerLeft(payload))
  socket.on('playerEliminated', (payload) => handlers.onPlayerEliminated(payload))
  socket.on('host', (payload) => handlers.onHost(payload))
  socket.on('gameStarted', (payload) => handlers.onGameStarted(payload))
  socket.on('piece', (payload) => handlers.onPiece(payload))
  socket.on('spectrum', (payload) => handlers.onSpectrum(payload))
  socket.on('penalty', (payload) => handlers.onPenalty(payload))
  socket.on('gameOver', (payload) => handlers.onGameOver(payload))

  return {
    emit: (event, ...args) => {
      socket.emit(event, ...args)
    },
    close: () => {
      if (socket.connected) {
        socket.disconnect()
        return
      }
      // Still establishing the transport: aborting mid-handshake trips the
      // dev WS proxy (write EPIPE). Wait for the handshake to complete, then
      // close cleanly — the socket never emits `join`, so no player lingers.
      socket.once('connect', () => socket.disconnect())
    },
  }
}