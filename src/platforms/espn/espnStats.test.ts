import { describe, expect, it } from 'vitest'
import { toScoring } from './espnStats.ts'

describe('toScoring', () => {
  it('renames ESPN’s numbered stats to our stat names', () => {
    const { scoring, gaps } = toScoring([
      { statId: 53, points: 1 },
      { statId: 3, points: 0.04 },
      { statId: 4, points: 4 },
      { statId: 72, points: -2 },
    ])
    expect(scoring).toEqual({ rec: 1, pass_yd: 0.04, pass_td: 4, fum_lost: -2 })
    expect(gaps).toBe(0)
  })

  it('counts an offensive rule it can’t translate as a gap', () => {
    // 21 is below 74 (so offensive) and isn't in the table
    expect(toScoring([{ statId: 53, points: 1 }, { statId: 21, points: 0.5 }]).gaps).toBe(1)
  })

  it('ignores kicking and defense rules, and rules worth nothing', () => {
    const { scoring, gaps } = toScoring([
      { statId: 80, points: 3 },
      { statId: 99, points: 1 },
      { statId: 22, points: 0 },
    ])
    expect(scoring).toEqual({})
    expect(gaps).toBe(0)
  })
})
