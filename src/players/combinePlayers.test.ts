import { beforeAll, describe, expect, it } from 'vitest'
import type { League } from '../platforms/types.ts'
import { loadDemo } from '../testing/demo.ts'
import { combinePlayers } from './combinePlayers.ts'

const league = (id: string) => ({ id, name: `League ${id}` }) as League
const player = (playerId: string, points: number | null, projected: number | null = null) => ({
  playerId,
  points,
  projected,
  isStarter: true,
})

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
          { leagueId: 'A', leagueName: 'League A', points: 10, projected: 9.5 },
          { leagueId: 'B', leagueName: 'League B', points: 12, projected: null },
        ],
      },
      {
        playerId: 'y',
        leagues: [{ leagueId: 'A', leagueName: 'League A', points: 5, projected: null }],
      },
    ])
  })

  it('sorts by number of leagues, then by points', () => {
    const combined = combinePlayers([
      { league: league('A'), myPlayers: [player('low', 1), player('high', 30), player('both', 2)] },
      { league: league('B'), myPlayers: [player('both', null)] },
    ])
    expect(combined.map((entry) => entry.playerId)).toEqual(['both', 'high', 'low'])
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
