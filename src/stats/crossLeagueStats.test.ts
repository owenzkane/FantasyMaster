import { beforeAll, describe, expect, it } from 'vitest'
import type { League, LeagueMember } from '../platforms/types.ts'
import { loadDemo } from '../testing/demo.ts'
import { crossLeagueStats } from './crossLeagueStats.ts'

const league = (name: string) => ({ id: name, name, platform: 'sleeper' }) as League
const member = (id: string, extra: Partial<LeagueMember> = {}): LeagueMember => ({
  id,
  displayName: id,
  realName: null,
  teamName: null,
  isMe: false,
  ...extra,
})
const record = (wins: number, losses: number, pointsFor: number) => ({ wins, losses, ties: 0, pointsFor })

describe('crossLeagueStats', () => {
  it('works out points per game for each league', () => {
    const stats = crossLeagueStats([
      { league: league('A'), season: record(3, 1, 480), members: [], myPlayers: [] },
    ])
    expect(stats.records[0]).toMatchObject({ games: 4, pointsPerGame: 120 })
  })

  it('divides total points by total games, so every game counts equally', () => {
    const stats = crossLeagueStats([
      { league: league('A'), season: record(1, 0, 100), members: [], myPlayers: [] },
      { league: league('B'), season: record(2, 1, 360), members: [], myPlayers: [] },
    ])
    // (100 + 360) / 4 games = 115. Averaging the two league averages (100 and 120) would give 110.
    expect(stats.total).toEqual({ wins: 3, losses: 1, ties: 0, games: 4, pointsPerGame: 115 })
  })

  it('shows no points per game before any game is played', () => {
    const stats = crossLeagueStats([
      { league: league('A'), season: record(0, 0, 0), members: [], myPlayers: [] },
    ])
    expect(stats.records[0].pointsPerGame).toBeNull()
    expect(stats.total.pointsPerGame).toBeNull()
  })

  it('skips leagues where I have no team', () => {
    const stats = crossLeagueStats([{ league: league('A'), season: null, members: [], myPlayers: [] }])
    expect(stats.records).toEqual([])
  })

  it('finds managers in two or more of my leagues, never counting me', () => {
    const me = member('sleeper:me', { isMe: true })
    const stats = crossLeagueStats([
      { league: league('A'), season: null, members: [me, member('sleeper:pat'), member('sleeper:sam')], myPlayers: [] },
      { league: league('B'), season: null, members: [me, member('sleeper:pat', { teamName: 'Pat’s Team' })], myPlayers: [] },
    ])
    expect(stats.sharedManagers).toEqual([
      {
        id: 'sleeper:pat',
        name: 'sleeper:pat',
        leagues: [
          { leagueName: 'A', teamName: null },
          { leagueName: 'B', teamName: 'Pat’s Team' },
        ],
      },
    ])
  })

  it('shows a manager’s real name when the platform gives one', () => {
    const pat = member('espn:pat', { displayName: 'ESPNfan123', realName: 'Pat Smith' })
    const stats = crossLeagueStats([
      { league: league('A'), season: null, members: [pat], myPlayers: [] },
      { league: league('B'), season: null, members: [pat], myPlayers: [] },
    ])
    expect(stats.sharedManagers[0].name).toBe('Pat Smith')
  })

  it('orders players by leagues held, even when I start a less-held player more', () => {
    const player = (playerId: string, isStarter: boolean) => ({ playerId, points: 1, projected: null, isStarter })
    const stats = crossLeagueStats([
      { league: league('A'), season: null, members: [], myPlayers: [player('held', false), player('used', true)] },
      { league: league('B'), season: null, members: [], myPlayers: [player('held', false), player('used', true)] },
      { league: league('C'), season: null, members: [], myPlayers: [player('held', false)] },
    ])
    expect(stats.sharedPlayers).toEqual([
      { playerId: 'held', leagueCount: 3 },
      { playerId: 'used', leagueCount: 2 },
    ])
  })

  it('lists players I roster in two or more leagues', () => {
    const player = (playerId: string) => ({ playerId, points: 1, projected: null, isStarter: true })
    const stats = crossLeagueStats([
      { league: league('A'), season: null, members: [], myPlayers: [player('x'), player('y')] },
      { league: league('B'), season: null, members: [], myPlayers: [player('x')] },
    ])
    expect(stats.sharedPlayers).toEqual([{ playerId: 'x', leagueCount: 2 }])
  })
})

describe('crossLeagueStats on the fixtures', () => {
  let stats: ReturnType<typeof crossLeagueStats>
  beforeAll(async () => {
    stats = crossLeagueStats((await loadDemo()).all)
  })

  it('gives each league’s record and points per game', () => {
    const rows = stats.records.map(({ league, record, pointsPerGame }) => [
      league.name,
      `${record.wins}-${record.losses}`,
      pointsPerGame === null ? null : Number(pointsPerGame.toFixed(2)),
    ])
    expect(rows).toEqual([
      ['Demo League 1', '0-4', 122.03],
      ['Demo League 2', '2-2', 109.11],
      ['Demo League 3', '3-1', 112.1],
      ['Demo League 4', '2-2', 112.7],
      ['Demo League 5', '2-2', 141.32],
      ['Demo League 6', '1-3', 116.55],
      ['Demo League 7 (bye week)', '1-3', 103.52],
      ['Demo League 8 (not drafted)', '0-0', null],
      ['Demo ESPN League', '2-2', 128.78],
    ])
  })

  it('totals 13 wins and 19 losses at 118.26 points per game', () => {
    expect(stats.total).toMatchObject({ wins: 13, losses: 19, ties: 0, games: 32 })
    expect(stats.total.pointsPerGame?.toFixed(2)).toBe('118.26')
  })

  it('finds nine managers who share two leagues with me, and nobody with more', () => {
    expect(stats.sharedManagers).toHaveLength(9)
    expect(stats.sharedManagers.every((manager) => manager.leagues.length === 2)).toBe(true)
  })
})
