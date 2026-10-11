import { beforeAll, describe, expect, it } from 'vitest'
import type { League } from '../platforms/types.ts'
import { loadDemo } from '../testing/demo.ts'
import { combinePlayers, startingCount } from './combinePlayers.ts'

const league = (id: string) => ({ id, name: `League ${id}` }) as League
const player = (
  playerId: string,
  points: number | null,
  projected: number | null = null,
  isStarter = true,
) => ({ playerId, points, projected, isStarter })
const bench = (playerId: string, points: number | null) => player(playerId, points, null, false)

describe('combinePlayers', () => {
  it('turns each league’s players into each player’s leagues', () => {
    const combined = combinePlayers([
      { league: league('A'), myPlayers: [player('x', 10, 9.5), player('y', 5)] },
      { league: league('B'), myPlayers: [player('x', 12)] },
    ])
    expect(combined).toEqual([
      {
        playerId: 'x',
        leagues: [
          { leagueId: 'A', leagueName: 'League A', points: 10, projected: 9.5, isStarter: true },
          { leagueId: 'B', leagueName: 'League B', points: 12, projected: null, isStarter: true },
        ],
      },
      {
        playerId: 'y',
        leagues: [
          { leagueId: 'A', leagueName: 'League A', points: 5, projected: null, isStarter: true },
        ],
      },
    ])
  })

  it('puts players started in the most leagues first', () => {
    const combined = combinePlayers([
      { league: league('A'), myPlayers: [player('one', 1), player('two', 2)] },
      { league: league('B'), myPlayers: [player('two', 2)] },
    ])
    expect(combined.map((entry) => entry.playerId)).toEqual(['two', 'one'])
  })

  it('ranks a player I bench everywhere below one I start once, however many leagues he’s in', () => {
    const combined = combinePlayers([
      { league: league('A'), myPlayers: [bench('held', 20), player('started', 1)] },
      { league: league('B'), myPlayers: [bench('held', 20)] },
      { league: league('C'), myPlayers: [bench('held', 20)] },
    ])
    expect(combined.map((entry) => entry.playerId)).toEqual(['started', 'held'])
    expect(combined.map(startingCount)).toEqual([1, 0])
  })

  it('breaks ties on leagues started by leagues held, then by points', () => {
    const combined = combinePlayers([
      {
        league: league('A'),
        myPlayers: [player('low', 1), player('high', 30), player('wide', 2), player('none', 50, null, false)],
      },
      { league: league('B'), myPlayers: [bench('wide', 2)] },
    ])
    // all but "none" are started once; "wide" is held in two leagues; then 30 points beats 1
    expect(combined.map((entry) => entry.playerId)).toEqual(['wide', 'high', 'low', 'none'])
  })

  it('returns nothing for no leagues', () => {
    expect(combinePlayers([])).toEqual([])
  })
})

describe('combinePlayers on the fixtures', () => {
  let demo: Awaited<ReturnType<typeof loadDemo>>
  beforeAll(async () => {
    demo = await loadDemo()
  })

  it('finds 93 different players across the Sleeper leagues', () => {
    expect(combinePlayers(demo.sleeper)).toHaveLength(93)
  })

  it('keeps a player’s points separate per league, since scoring differs', () => {
    const zay = combinePlayers(demo.sleeper).find(
      (entry) => entry.playerId === demo.playerId('Zay Flowers'),
    )
    expect(zay?.leagues.map((entry) => [entry.leagueName, entry.points])).toEqual([
      ['Demo League 1', 29.3],
      ['Demo League 2', 22.8],
      ['Demo League 5', 25.8],
      ['Demo League 6', 25.8],
    ])
  })

  it('lists every started player before any benched everywhere', () => {
    const counts = combinePlayers(demo.sleeper).map(startingCount)
    expect(counts).toEqual([...counts].sort((a, b) => b - a))
    expect(counts[0]).toBeGreaterThan(1)
    expect(counts.at(-1)).toBe(0)
  })

  it('counts a player on both platforms as one player', () => {
    const puka = combinePlayers(demo.all).find(
      (entry) => entry.playerId === demo.playerId('Puka Nacua'),
    )
    expect(puka?.leagues.map((entry) => entry.leagueName)).toEqual([
      'Demo League 5',
      'Demo ESPN League',
    ])
  })
})
