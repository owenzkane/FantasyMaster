import { beforeAll, describe, expect, it } from 'vitest'
import type { League } from '../platforms/types.ts'
import { loadDemo } from '../testing/demo.ts'
import { scenarioPlayers, scoringFormat, winScenarios } from './winScenarios.ts'

// A one-league setup where I have 100 and my opponent has 110
const league = { id: 'L', name: 'League L', pointsPerReception: 0.5 } as League
const player = (playerId: string, points: number, isStarter = true) => ({
  playerId,
  points,
  projected: null,
  isStarter,
})
const week = (myPlayers: ReturnType<typeof player>[], opponentPlayers: ReturnType<typeof player>[]) => ({
  league,
  matchup: {
    leagueId: 'L',
    week: 1,
    myPoints: 100,
    myProjected: null,
    myTeamName: null,
    opponent: { displayName: 'Them', teamName: null, points: 110, projected: null },
  },
  myPlayers,
  opponentPlayers,
})

describe('winScenarios', () => {
  it('for my starter: he needs more than their total minus my total without him', () => {
    // Without his 20 I have 80, so he must beat 110 - 80 = 30
    const [scenario] = winScenarios('mine', [week([player('mine', 20)], [])])
    expect(scenario).toMatchObject({
      role: 'myStarter',
      currentPoints: 20,
      threshold: 30,
      standing: 'losing',
    })
  })

  it('for my opponent’s starter: he must stay under my total minus theirs without him', () => {
    // Without his 25 they have 85, so he must stay under 100 - 85 = 15
    const [scenario] = winScenarios('theirs', [week([], [player('theirs', 25)])])
    expect(scenario).toMatchObject({ role: 'opponentStarter', currentPoints: 25, threshold: 15 })
  })

  it('gives bench players no threshold, because their points don’t count', () => {
    const scenarios = winScenarios('sub', [week([player('sub', 40, false)], [])])
    expect(scenarios[0]).toMatchObject({ role: 'myBench', threshold: null })
    const theirs = winScenarios('sub', [week([], [player('sub', 40, false)])])
    expect(theirs[0]).toMatchObject({ role: 'opponentBench', threshold: null })
  })

  it('leaves out leagues he isn’t in, and leagues with no opponent', () => {
    const noOpponent = { ...week([player('mine', 20)], []) }
    noOpponent.matchup = { ...noOpponent.matchup, opponent: null as never }
    expect(winScenarios('mine', [noOpponent])).toEqual([])
    expect(winScenarios('someone-else', [week([player('mine', 20)], [])])).toEqual([])
  })

  it('rounds thresholds to two decimals', () => {
    const tricky = week([player('mine', 0.1)], [])
    tricky.matchup = { ...tricky.matchup, myPoints: 0.3, opponent: { ...tricky.matchup.opponent, points: 0.6 } }
    // 0.6 - (0.3 - 0.1) is 0.39999999999999997 in floating point
    expect(winScenarios('mine', [tricky])[0].threshold).toBe(0.4)
  })
})

describe('scenarioPlayers', () => {
  it('lists every starter in my matchups, most leagues first, and skips the bench', () => {
    const players = scenarioPlayers([
      week([player('a', 1), player('bench', 1, false)], [player('b', 1)]),
      week([player('b', 1)], []),
    ])
    expect(players).toEqual([
      { playerId: 'b', leagueCount: 2 },
      { playerId: 'a', leagueCount: 1 },
    ])
  })
})

describe('scoringFormat', () => {
  it('names the reception scoring', () => {
    const format = (pointsPerReception: number) => scoringFormat({ pointsPerReception } as League)
    expect(format(1)).toBe('PPR')
    expect(format(0.5)).toBe('Half PPR')
    expect(format(0)).toBe('Standard')
    expect(format(0.25)).toBe('0.25 per reception')
  })
})

describe('winScenarios on the fixtures', () => {
  let demo: Awaited<ReturnType<typeof loadDemo>>
  beforeAll(async () => {
    demo = await loadDemo()
  })
  const rows = (name: string) =>
    winScenarios(demo.playerId(name), demo.sleeper).map((scenario) => [
      scenario.league.name,
      scenario.role,
      scenario.currentPoints,
      scenario.threshold,
      scenario.standing,
    ])

  it('Trevor Lawrence: faced in one league, started in two', () => {
    expect(rows('Trevor Lawrence')).toEqual([
      ['Demo League 2', 'opponentStarter', 13.08, 13.36, 'winning'],
      ['Demo League 4', 'myStarter', 15.08, -31.9, 'winning'],
      ['Demo League 5', 'myStarter', 24.08, -17.77, 'winning'],
    ])
  })

  it('Zay Flowers: started in two leagues, benched in two', () => {
    expect(rows('Zay Flowers')).toEqual([
      ['Demo League 1', 'myStarter', 29.3, 62.95, 'losing'],
      ['Demo League 2', 'myStarter', 22.8, 22.52, 'winning'],
      ['Demo League 5', 'myBench', 25.8, null, 'winning'],
      ['Demo League 6', 'myBench', 25.8, null, 'losing'],
    ])
  })

  it('covers an ESPN league alongside the Sleeper ones', () => {
    const scenarios = winScenarios(demo.playerId('Parker Washington'), demo.all)
    expect(scenarios.at(-1)).toMatchObject({
      league: { name: 'Demo ESPN League', platform: 'espn' },
      role: 'myStarter',
      currentPoints: 2,
      threshold: 32.96,
    })
  })
})
