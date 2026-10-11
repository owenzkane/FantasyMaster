import { describe, expect, it } from 'vitest'
import { projectedTotal, round2 } from './scoring.ts'

const player = (projected: number | null, isStarter = true) => ({
  playerId: 'x',
  points: 0,
  projected,
  isStarter,
})

describe('projectedTotal', () => {
  it('adds up the starters’ projections and leaves the bench out', () => {
    expect(projectedTotal([player(10.5), player(7.25), player(99, false)])).toBe(17.75)
  })

  it('counts a starter with no projection as nothing', () => {
    expect(projectedTotal([player(10.5), player(null)])).toBe(10.5)
  })

  it('is null, not zero, when no starter has a projection', () => {
    expect(projectedTotal([player(null), player(12, false)])).toBeNull()
    expect(projectedTotal([])).toBeNull()
  })
})

describe('round2', () => {
  it('removes floating-point noise', () => {
    expect(round2(18.520000000000003)).toBe(18.52)
    expect(round2(0.1 + 0.2)).toBe(0.3)
  })
})
