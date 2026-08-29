import type { Server } from 'socket.io'
import { isValidName, isValidSpectrum } from '../shared/validation.ts'
import type {
  ClientToServerEvents,
  PlayerPublic,
  RoomState,
  ServerToClientEvents,
} from '../shared/protocol.ts'
import { Game, Player } from './domain.ts'

export type TetrisServer = Server<ClientToServerEvents, ServerToClientEvents>

const games = new Map<string, Game>()

function playerPublic(player: Player): PlayerPublic {
  return {
    id: player.socketId,
    name: player.name,
    isHost: player.isHost,
    eliminated: player.eliminated,
    spectrum: player.spectrum,
  }
}

function roomState(game: Game): RoomState {
  return {
    room: game.room,
    status: game.status,
    round: game.round,
    players: [...game.players.values()].map(playerPublic),
  }
}

function requireGame(socketId: string): Game | null {
  for (const game of games.values()) {
    if (game.players.has(socketId)) {
      return game
    }
  }
  return null
}

function currentPlayer(game: Game | null, socketId: string): Player | undefined {
  return game?.players.get(socketId)
}

export function attachSockets(io: TetrisServer): void {
  io.on('connection', (socket) => {
    socket.on('join', ({ room, playerName }) => {
      const trimmedRoom = room.trim()
      const trimmedName = playerName.trim()

      if (!isValidName(trimmedRoom) || !isValidName(trimmedName)) {
        socket.emit('error', { message: 'Invalid room or player name.' })
        return
      }
      if (requireGame(socket.id) !== null) {
        socket.emit('error', { message: 'You are already in a game.' })
        return
      }

      const game = games.get(trimmedRoom) ?? new Game(trimmedRoom)
      games.set(game.room, game)

      if (game.status !== 'waiting') {
        socket.emit('error', { message: `Game "${game.room}" already running.` })
        return
      }

      if(game.getPlayerByName(trimmedName)){
        socket.emit('error', { message: `Player "${trimmedName}" already exist.` })
        return
      }
      
      const player = game.addPlayer(trimmedName, socket.id)
      socket.data.room = game.room
      socket.join(game.room)

      socket.emit('state', roomState(game))
      socket.to(game.room).emit('playerJoined', { room: game.room, player: playerPublic(player) })
      if (player.isHost) {
        io.to(game.room).emit('host', { playerName: player.name })
      }
    })

    socket.on('leave', () => {
      removePlayer(io, socket.id, socket.data.room as string | undefined)
    })

    socket.on('disconnect', () => {
      removePlayer(io, socket.id, socket.data.room as string | undefined)
    })

    socket.on('start', () => {
      const game = requireGame(socket.id)
      if (game === null || game.hostId !== socket.id) {
        socket.emit('error', { message: 'Only the host can start the game.' })
        return
      }
      if (!game.start()) {
        socket.emit('error', { message: 'Game already running.' })
        return
      }
      announceRound(io, game)
    })

    socket.on('restart', () => {
      const game = requireGame(socket.id)
      if (game === null || game.hostId !== socket.id) {
        socket.emit('error', { message: 'Only the host can restart the game.' })
        return
      }
      if (!game.restart()) {
        socket.emit('error', { message: 'No finished round to restart.' })
        return
      }
      announceRound(io, game)
    })

    socket.on('move', () => {
      // Input is simulated locally on the client; the server stays
      // authoritative for pieces, penalties and spectrum relay only.
    })

    socket.on('lock', ({ spectrum }) => {
      const game = requireGame(socket.id)
      const player = currentPlayer(game, socket.id)
      if (game === null || game.status !== 'running' || player === undefined || player.eliminated) {
        return
      }
      if (!isValidSpectrum(spectrum)) {
        return
      }
      player.spectrum = spectrum
      socket.to(game.room).emit('spectrum', { playerName: player.name, spectrum })

      const next = game.pieceFor(socket.id)
      if (next !== null) {
        socket.emit('piece', next)
      }
    })

    socket.on('linesCleared', ({ count, spectrum }) => {
      const game = requireGame(socket.id)
      const player = currentPlayer(game, socket.id)
      if (game === null || game.status !== 'running' || player === undefined || player.eliminated) {
        return
      }
      if (!isValidSpectrum(spectrum)) {
        return
      }
      player.spectrum = spectrum
      socket.to(game.room).emit('spectrum', { playerName: player.name, spectrum })

      if (count > 1 && game.playerCount() > 1) {
        const penalty = count - 1
        for (const opponent of game.players.values()) {
          if (opponent.socketId !== socket.id) {
            socket.to(opponent.socketId).emit('penalty', { lines: penalty })
          }
        }
      }
    })

    socket.on('spectrumHeartbeat', ({ spectrum }) => {
      const game = requireGame(socket.id)
      const player = currentPlayer(game, socket.id)
      if (game === null || game.status !== 'running' || player === undefined || player.eliminated) {
        return
      }
      if (!isValidSpectrum(spectrum)) {
        return
      }
      player.spectrum = spectrum
      socket.to(game.room).emit('spectrum', { playerName: player.name, spectrum })
    })

    socket.on('topOut', () => {
      const game = requireGame(socket.id)
      const player = currentPlayer(game, socket.id)
      if (game === null || game.status !== 'running' || player === undefined || player.eliminated) {
        return
      }
      io.to(game.room).emit('playerEliminated', { playerName: player.name })
      const result = game.topOut(socket.id)
      if (result !== null) {
        io.to(game.room).emit('gameOver', { winner: result.winner })
        io.to(game.room).emit('state', roomState(game))
      }
    })
  })
}

function announceRound(io: TetrisServer, game: Game): void {
  io.to(game.room).emit('gameStarted', {
    room: game.room,
    round: game.round,
    players: [...game.players.values()].map(playerPublic),
    queue: game.nextQueue(),
  })
  for (const player of game.players.values()) {
    const piece = game.pieceFor(player.socketId)
    if (piece !== null) {
      io.to(player.socketId).emit('piece', piece)
    }
  }
}

function removePlayer(
  io: TetrisServer,
  socketId: string,
  roomName: string | undefined,
): void {
  const game = requireGame(socketId)
  if (game === null || (roomName !== undefined && roomName !== game.room)) {
    return
  }

  const player = game.players.get(socketId)
  game.removePlayer(socketId)

  if (game.playerCount() === 0) {
    io.in(game.room).disconnectSockets()
    games.delete(game.room)
    return
  }

  io.to(game.room).emit('playerLeft', { room: game.room, playerName: player?.name ?? 'unknown' })
  const newHost = game.hostId !== null ? (game.players.get(game.hostId)?.name ?? null) : null
  if (newHost !== null) {
    io.to(game.room).emit('host', { playerName: newHost })
  }

  if (game.status === 'running' && game.aliveCount() <= 1) {
    const survivor = [...game.players.values()].filter((p) => !p.eliminated)
    game.status = 'finished'
    io.to(game.room).emit('gameOver', { winner: survivor[0]?.name ?? null })
    io.to(game.room).emit('state', roomState(game))
  }
}