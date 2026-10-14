import { describe, it, expect } from 'vitest'
import { Game, Piece } from './domain.ts'
import { HORIZON_LENGTH, type PieceKind } from '../shared/protocol.ts'

function freshRoom(): Game {
  return new Game('zen')
}

describe('Piece', () => {
  it('serializes to the wire payload without mutating the piece', () => {
    const piece = new Piece('T', 4)
    const next: PieceKind[] = ['I', 'O']
    const payload = piece.toPayload(next)
    expect(payload).toEqual({ type: 'T', index: 4, next: ['I', 'O'] })
    expect(piece.type).toBe('T')
    expect(piece.index).toBe(4)
  })

  it('gives every piece of a shared sequence a distinct contiguous index', () => {
    const game = freshRoom()
    game.addPlayer('alice', 's1')
    game.start()
    game.pieceFor('s1')
    game.pieceFor('s1')
    const indexes = game.sequence.map((piece) => piece.index)
    expect(indexes.length).toBeGreaterThan(1)
    expect(new Set(indexes).size).toBe(indexes.length)
    expect(indexes).toEqual(indexes.map((_, position) => position))
  })

  it('never stores the look-ahead horizon on the instance', () => {
    const piece = new Piece('S', 0)
    piece.toPayload(['L', 'J', 'Z'])
    expect('next' in piece).toBe(false)
  })
})

describe('Game.players & host', () => {
  it('first player becomes host, next joins as guest', () => {
    const game = freshRoom()
    const host = game.addPlayer('alice', 's1')
    const guest = game.addPlayer('bob', 's2')
    expect(host.isHost).toBe(true)
    expect(guest.isHost).toBe(false)
    expect(game.hostId).toBe('s1')
  })

  it('re-elects the next player when the host leaves', () => {
    const game = freshRoom()
    game.addPlayer('alice', 's1')
    game.addPlayer('bob', 's2')
    game.removePlayer('s1')
    expect(game.hostId).toBe('s2')
    expect(game.players.get('s2')!.isHost).toBe(true)
  })

  it('takeHost flips the flag between players', () => {
    const game = freshRoom()
    game.addPlayer('alice', 's1')
    game.addPlayer('bob', 's2')
    game.takeHost('s2')
    expect(game.players.get('s1')!.isHost).toBe(false)
    expect(game.players.get('s2')!.isHost).toBe(true)
    expect(game.hostId).toBe('s2')
  })
})

describe('Game.round lifecycle', () => {
  it('can only start from waiting', () => {
    const game = freshRoom()
    game.addPlayer('alice', 's1')
    expect(game.start()).toBe(true)
    expect(game.status).toBe('running')
    expect(game.round).toBe(1)
    expect(game.start()).toBe(false)
  })

  it('can only restart from finished', () => {
    const game = freshRoom()
    game.addPlayer('alice', 's1')
    game.start()
    game.topOut('s1')
    expect(game.status).toBe('finished')
    expect(game.restart()).toBe(true)
    expect(game.round).toBe(2)
    expect(game.status).toBe('running')
    expect(game.restart()).toBe(false)
  })

  it('beginning a round resets eliminated flags and piece indexes', () => {
    const game = freshRoom()
    game.addPlayer('alice', 's1')
    game.addPlayer('bob', 's2')
    game.start()
    game.pieceFor('s1')
    game.topOut('s1')
    expect(game.players.get('s1')!.eliminated).toBe(true)
    game.restart()
    expect(game.players.get('s1')!.eliminated).toBe(false)
    expect(game.players.get('s1')!.nextIndex).toBe(0)
  })
})

describe('Game.shared sequence', () => {
  it('gives each player the same first piece', () => {
    const game = freshRoom()
    game.addPlayer('alice', 's1')
    game.addPlayer('bob', 's2')
    game.start()
    const a = game.pieceFor('s1')
    const b = game.pieceFor('s2')
    expect(a!.type).toBe(b!.type)
    expect(a!.index).toBe(0)
    expect(b!.index).toBe(0)
  })

  it('advances each player independently through the shared sequence', () => {
    const game = freshRoom()
    game.addPlayer('alice', 's1')
    game.addPlayer('bob', 's2')
    game.start()
    const b0 = game.pieceFor('s2')!
    const a0 = game.pieceFor('s1')!
    expect(a0.type).toBe(b0.type)
    expect(a0.index).toBe(0)
    const a1 = game.pieceFor('s1')!
    expect(a1.index).toBe(1)
    expect(a1.type).toBe(b0.next[0])
  })

  it('serves a horizon of exactly HORIZON_LENGTH known pieces', () => {
    const game = freshRoom()
    game.addPlayer('alice', 's1')
    game.start()
    const piece = game.pieceFor('s1')!
    expect(piece.next).toHaveLength(HORIZON_LENGTH)
    const known: PieceKind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
    for (const type of [piece.type, ...piece.next]) {
      expect(known).toContain(type)
    }
  })

  it('never serves pieces to eliminated players', () => {
    const game = freshRoom()
    game.addPlayer('alice', 's1')
    game.addPlayer('bob', 's2')
    game.start()
    game.topOut('s1')
    expect(game.pieceFor('s1')).toBeNull()
    expect(game.pieceFor('s2')).not.toBeNull()
  })
})

describe('Game.topOut', () => {
  it('finishes with the survivor as winner in a two-player match', () => {
    const game = freshRoom()
    game.addPlayer('alice', 's1')
    game.addPlayer('bob', 's2')
    game.start()
    const result = game.topOut('s1')
    expect(result).toEqual({ winner: 'bob' })
    expect(game.status).toBe('finished')
  })

  it('keeps the round running while more than one player is alive', () => {
    const game = freshRoom()
    game.addPlayer('alice', 's1')
    game.addPlayer('bob', 's2')
    game.addPlayer('carol', 's3')
    game.start()
    expect(game.topOut('s1')).toBeNull()
    expect(game.status).toBe('running')
    expect(game.topOut('s2')).toEqual({ winner: 'carol' })
    expect(game.status).toBe('finished')
  })

  it('finishes with no winner in solo top-out', () => {
    const game = freshRoom()
    game.addPlayer('alice', 's1')
    game.start()
    expect(game.topOut('s1')).toEqual({ winner: null })
    expect(game.status).toBe('finished')
  })

  it('double top-out events are ignored', () => {
    const game = freshRoom()
    game.addPlayer('alice', 's1')
    game.addPlayer('bob', 's2')
    game.start()
    expect(game.topOut('s1')).toEqual({ winner: 'bob' })
    expect(game.status).toBe('finished')
    expect(game.topOut('s1')).toBeNull()
    expect(game.topOut('s2')).toBeNull()
  })

  it('alive count tracks eliminated players', () => {
    const game = freshRoom()
    game.addPlayer('alice', 's1')
    game.addPlayer('bob', 's2')
    game.addPlayer('carol', 's3')
    game.start()
    expect(game.aliveCount()).toBe(3)
    game.topOut('s1')
    expect(game.aliveCount()).toBe(2)
  })
})