import { describe, expect, it } from 'vitest'
import type { League } from '../platforms/types.ts'
import { neededStat } from './neededStat.ts'
import type { LeagueScenario, ScenarioRole } from './winScenarios.ts'

const scenario = (role: ScenarioRole, threshold: number | null): LeagueScenario => ({
  league: { id: 'L', name: 'L' } as League,
  role,
  currentPoints: 0,
  threshold,
  standing: 'winning',
})
// A tenth of a point per yard on top of 5 points from the rest of his line
const yards = (value: number) => Math.round((5 + value * 0.1) * 100) / 100
const MAX = 400

describe('neededStat when I start him', () => {
  it('gives the smallest value that puts him over the threshold', () => {
    // needs more than 12: 71 yards makes 12.1
    expect(neededStat(scenario('myStarter', 12), MAX, yards)).toBe('At least 71')
  })

  it('says "Any" when he’s already over with none', () => {
    expect(neededStat(scenario('myStarter', 4), MAX, yards)).toBe('Any')
  })

  it('says "Out of reach" when even a huge game isn’t enough', () => {
    expect(neededStat(scenario('myStarter', 80), MAX, yards)).toBe('Out of reach')
  })
})

describe('neededStat when I face him', () => {
  it('gives the first value that is too many, as a "fewer than"', () => {
    // must stay under 12: 69 yards makes 11.9, 70 makes 12.0 which only ties
    expect(neededStat(scenario('opponentStarter', 12), MAX, yards)).toBe('Fewer than 70')
  })

  it('still gives a number when the limit is far beyond a realistic game', () => {
    // must stay under 67.58: 625 yards makes 67.5, 626 makes 67.6
    expect(neededStat(scenario('opponentStarter', 67.58), MAX, yards)).toBe('Fewer than 626')
    // a limit right at the edge of the usual range
    expect(neededStat(scenario('opponentStarter', 45.05), MAX, yards)).toBe('Fewer than 401')
  })

  it('says "You can’t win" when he’s already at or over the threshold with none', () => {
    expect(neededStat(scenario('opponentStarter', 5), MAX, yards)).toBe('You can’t win')
    expect(neededStat(scenario('opponentStarter', -3), MAX, yards)).toBe('You can’t win')
  })

  it('says "Any" only when the stat doesn’t move his score in that league', () => {
    const unscored = () => 5
    expect(neededStat(scenario('opponentStarter', 12), MAX, unscored)).toBe('Any')
  })

  it('handles a bonus that makes his points jump', () => {
    // 3 extra points at 100 yards: 99 yards is 14.9, 100 yards is 18.0
    const withBonus = (value: number) => yards(value) + (value >= 100 ? 3 : 0)
    expect(neededStat(scenario('opponentStarter', 16), MAX, withBonus)).toBe('Fewer than 100')
  })
})

describe('neededStat on the bench', () => {
  it('doesn’t count', () => {
    expect(neededStat(scenario('myBench', null), MAX, yards)).toBe('Doesn’t count')
  })
})
