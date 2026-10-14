import {
  HORIZON_LENGTH,
  type GameStatus,
  type PieceKind,
  type ServerToClientEvents,
} from '../shared/protocol.ts'

type PiecePayload = Parameters<ServerToClientEvents['piece']>[0]

const BAG: PieceKind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

function shuffle<T>(input: readonly T[]): T[] {
  const items = [...input]
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = items[i]!
    items[i] = items[j]!
    items[j] = tmp
  }
  return items
}

/**
 * Piece: one occurrence in the shared sequence of a room. The server is only
 * responsible for the distribution (which occurrence, to which player, with
 * which look-ahead horizon); shape, rotation and gravity live on the client as
 * pure functions.
 */
class Piece {
  readonly type: PieceKind
  readonly index: number

  constructor(type: PieceKind, index: number) {
    this.type = type
    this.index = index
  }

  /**
   * Wire payload for the `piece` event. `next` is derived from the sequence at
   * send time and is NEVER stored on the instance: it would be duplicated and
   * could go stale as soon as the sequence grows.
   */
  toPayload(next: PieceKind[]): PiecePayload {
    return { type: this.type, index: this.index, next }
  }
}

/**
 * Player: one connected participant in a room.
 * The field itself is simulated on the client; the server only stores the
 * relayed spectrum and the player's position in the shared piece sequence.
 */
class Player {
  readonly name: string
  readonly socketId: string
  isHost: boolean
  eliminated: boolean
  spectrum: number[]
  nextIndex: number

  constructor(name: string, socketId: string, isHost = false) {
    this.name = name
    this.socketId = socketId
    this.isHost = isHost
    this.eliminated = false
    this.spectrum = Array<number>(10).fill(0)
    this.nextIndex = 0
  }
}

/**
 * Game: the server-side room. Distributes the *same* piece sequence to every
 * player (each one consuming it at their own pace), tracks the host and the
 * round lifecycle, and applies the unified finish rule (alive ≤ 1).
 */
class Game {
  readonly room: string
  readonly sequence: Piece[]
  status: GameStatus
  round: number
  players: Map<string, Player>
  hostId: string | null

  constructor(room: string) {
    this.room = room
    this.sequence = []
    this.status = 'waiting'
    this.round = 0
    this.players = new Map()
    this.hostId = null
  }

  playerCount(): number {
    return this.players.size
  }

  addPlayer(name: string, socketId: string): Player {
    const wasEmpty = this.playerCount() === 0
    const player = new Player(name, socketId, wasEmpty)
    this.players.set(socketId, player)
    if (wasEmpty) {
      this.hostId = socketId
    }
    return player
  }
  getPlayerByName(name: string): Player | null {
    for (const player of this.players.values()) {
      if (player.name === name) {
        return player
      }
    }
    return null
  }

  removePlayer(socketId: string): void {
    this.players.delete(socketId)
    if (this.hostId === socketId) {
      this.hostId = this.players.keys().next().value ?? null
      const next = this.hostId !== null ? this.players.get(this.hostId) : undefined
      if (next !== undefined) {
        next.isHost = true
      }
    }
  }

  takeHost(socketId: string): void {
    if (this.hostId === socketId) {
      return
    }
    const previous = this.hostId !== null ? this.players.get(this.hostId) : undefined
    if (previous !== undefined) {
      previous.isHost = false
    }
    const next = this.players.get(socketId)
    if (next !== undefined) {
      next.isHost = true
    }
    this.hostId = socketId
  }

  aliveCount(): number {
    return [...this.players.values()].filter((player) => !player.eliminated).length
  }

  /** waiting → running. Returns false when not admissible. */
  start(): boolean {
    if (this.status !== 'waiting') {
      return false
    }
    this.beginRound()
    return true
  }

  /** finished → running. Returns false when not admissible. */
  restart(): boolean {
    if (this.status !== 'finished') {
      return false
    }
    this.beginRound()
    return true
  }

  private beginRound(): void {
    this.status = 'running'
    this.round += 1
    for (const player of this.players.values()) {
      player.eliminated = false
      player.nextIndex = 0
    }
  }

  private ensureSequence(length: number): void {
    while (this.sequence.length < length) {
      for (const type of shuffle(BAG)) {
        this.sequence.push(new Piece(type, this.sequence.length))
      }
    }
  }

  /** The look-ahead horizon served right after `piece`. */
  private horizonAfter(piece: Piece, length = HORIZON_LENGTH): PieceKind[] {
    return Array.from({ length }, (_, i) => this.sequence[piece.index + 1 + i]!.type)
  }

  /** The horizon after the first piece of a fresh round. */
  nextQueue(): PieceKind[] {
    this.ensureSequence(1 + HORIZON_LENGTH)
    return this.horizonAfter(this.sequence[0]!)
  }

  /**
   * Next piece for `socketId` in the shared sequence, with a look-ahead
   * horizon. All players read the same sequence; indexes may differ.
   */
  pieceFor(socketId: string): PiecePayload | null {
    const player = this.players.get(socketId)
    if (player === undefined || player.eliminated) {
      return null
    }
    this.ensureSequence(player.nextIndex + 1 + HORIZON_LENGTH)
    const current = this.sequence[player.nextIndex]!
    player.nextIndex += 1
    return current.toPayload(this.horizonAfter(current))
  }

  /**
   * Top-out: the player is eliminated. Finishes the round when one player
   * (or none, in solo) remains alive.
   */
  topOut(socketId: string): { winner: string | null } | null {
    const player = this.players.get(socketId)
    if (player === undefined || player.eliminated || this.status !== 'running') {
      return null
    }
    player.eliminated = true
    if (this.aliveCount() > 1) {
      return null
    }
    this.status = 'finished'
    const survivor = [...this.players.values()].find((p) => !p.eliminated)
    return { winner: survivor?.name ?? null }
  }
}

export { Player, Piece, Game }