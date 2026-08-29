import { describe, expect, it } from 'vitest'
import type { PieceKind } from './protocol.ts'
import {
  MAX_HEIGHT,
  MAX_CLEAR_COUNT,
  MIN_HEIGHT,
  MIN_CLEAR_COUNT,
  validateJoin,
  isValidAction,
  isValidClearCount,
  isValidName,
  isValidSpectrum,
  isValidPieceIndex,
  isValidHorizon,
} from './validation.ts'

describe('validateJoin', () => {
  it('accepts compact hyphen/underscore names of 1..24 characters', () => {
    expect(validateJoin('salle-42', 'warol52')).toBe(true)
    expect(validateJoin('a', 'b')).toBe(true)
    expect(validateJoin('room_x', 'player-name')).toBe(true)
  })

  it('rejects empty values, spaces and overlong names', () => {
    expect(validateJoin('', 'bob')).toBe(false)
    expect(validateJoin('salle 42', 'bob')).toBe(false)
    expect(validateJoin('salon', 'un nom trop long avec espaces')).toBe(false)
    expect(validateJoin('x'.repeat(25), 'bob')).toBe(false)
    expect(validateJoin('salle', '')).toBe(false)
  })
})

describe('isValidName', () => {
  it('trims surrounding whitespace before testing', () => {
    expect(isValidName('  bob  ')).toBe(true)
  })
})

describe('isValidSpectrum', () => {
  it('accepts a 10-col spectrum with heights in 0..20', () => {
    expect(isValidSpectrum([0, 1, 2, 3, 4, 5, 6, 7, 8, 20])).toBe(true)
    expect(isValidSpectrum(new Array(10).fill(0))).toBe(true)
    expect(isValidSpectrum(new Array(10).fill(20))).toBe(true)
  })

  it('rejects wrong lengths', () => {
    expect(isValidSpectrum([])).toBe(false)
    expect(isValidSpectrum(new Array(9).fill(0))).toBe(false)
    expect(isValidSpectrum(new Array(11).fill(0))).toBe(false)
  })

  it('rejects heights outside the visible board', () => {
    const above = new Array(10).fill(MIN_HEIGHT)
    above[0] = MAX_HEIGHT + 1
    expect(isValidSpectrum(above)).toBe(false)
    const below = new Array(10).fill(MIN_HEIGHT)
    below[3] = MIN_HEIGHT - 1
    expect(isValidSpectrum(below)).toBe(false)
  })
})

describe('isValidClearCount', () => {
  it('accepts clears of 1..4 lines', () => {
    for (let n = MIN_CLEAR_COUNT; n <= MAX_CLEAR_COUNT; n++) {
      expect(isValidClearCount(n)).toBe(true)
    }
  })

  it('rejects out-of-range counts', () => {
    expect(isValidClearCount(0)).toBe(false)
    expect(isValidClearCount(5)).toBe(false)
    expect(isValidClearCount(-1)).toBe(false)
  })
})

describe('isValidAction', () => {
  it('accepts the whitelisted actions only', () => {
    expect(isValidAction('left')).toBe(true)
    expect(isValidAction('rotate')).toBe(true)
    expect(isValidAction('harddrop')).toBe(true)
    expect(isValidAction('diagonal')).toBe(false)
    expect(isValidAction('')).toBe(false)
  })
})

describe('isValidPieceIndex', () => {
  it('accepts non-negative indices', () => {
    expect(isValidPieceIndex(0)).toBe(true)
    expect(isValidPieceIndex(41)).toBe(true)
    expect(isValidPieceIndex(-1)).toBe(false)
  })
})

describe('isValidHorizon', () => {
  it('accepts a horizon of exactly 3 known pieces', () => {
    expect(isValidHorizon(['T', 'J', 'I'])).toBe(true)
  })

  it('rejects wrong length or unknown pieces', () => {
    expect(isValidHorizon(['T', 'J'])).toBe(false)
    expect(isValidHorizon(['T', 'J', 'X'] as unknown as PieceKind[])).toBe(false)
    expect(isValidHorizon([])).toBe(false)
  })
})