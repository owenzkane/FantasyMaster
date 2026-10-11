import { beforeAll, describe, expect, it } from 'vitest'
import { loadDemo, sumStarters } from '../../testing/demo.ts'
import { toLeagueWeek } from './sleeperPlatform.ts'
import type { SleeperLeagueUser, SleeperMatchup, SleeperRoster } from './sleeperTypes.ts'

let demo: Awaited<ReturnType<typeof loadDemo>>
beforeAll(async () => {
  demo = await loadDemo()
})

describe('Sleeper leagues from the fixtures (week 4)', () => {
  it('finds my score and my opponent’s in every league', () => {
    const scores = demo.sleeper.map(({ league, matchup }) => [
      league.name,
      matchup?.myPoints ?? null,
      matchup?.opponent?.points ?? null,
    ])
    expect(scores).toEqual([
      ['Demo League 1', 117.1, 150.75],
      ['Demo League 2', 135.66, 135.38],
      ['Demo League 3', 96.42, 79.58],
      ['Demo League 4', 134.28, 87.3],
      ['Demo League 5', 151.28, 109.43],
      ['Demo League 6', 92.92, 178.66],
      ['Demo League 7 (bye week)', 76.58, null],
      ['Demo League 8 (not drafted)', null, null],
    ])
  })

  it('names the opponent by team name and display name', () => {
    expect(demo.league('Demo League 1').matchup?.opponent).toEqual({
      displayName: 'manager_6',
      teamName: 'Team 6',
      points: 150.75,
    })
  })

  it('gives a matchup with no opponent on a bye', () => {
    const bye = demo.league('Demo League 7 (bye week)')
    expect(bye.matchup?.opponent).toBeNull()
    expect(bye.opponentPlayers).toEqual([])
    expect(bye.myPlayers.length).toBeGreaterThan(0)
  })

  it('gives no matchup and no players in a league that hasn’t drafted', () => {
    const undrafted = demo.league('Demo League 8 (not drafted)')
    expect(undrafted.matchup).toBeNull()
    expect(undrafted.myPlayers).toEqual([])
    expect(undrafted.season).toEqual({ wins: 0, losses: 0, ties: 0, pointsFor: 0 })
  })

  it('lists starters whose points add up to each team’s total', () => {
    for (const { matchup, myPlayers, opponentPlayers } of demo.sleeper) {
      if (!matchup) continue
      expect(sumStarters(myPlayers)).toBe(matchup.myPoints)
      if (matchup.opponent) expect(sumStarters(opponentPlayers)).toBe(matchup.opponent.points)
    }
  })

  it('puts starters before the bench', () => {
    const flags = demo.league('Demo League 1').myPlayers.map((player) => player.isStarter)
    expect(flags.lastIndexOf(true)).toBeLessThan(flags.indexOf(false))
  })

  it('reads the season record, joining the two halves of Sleeper’s points', () => {
    // fpts 488 and fpts_decimal 10 in the fixture
    expect(demo.league('Demo League 1').season).toEqual({
      wins: 0,
      losses: 4,
      ties: 0,
      pointsFor: 488.1,
    })
  })
})

// Small hand-made data, for cases the fixtures don't contain
describe('toLeagueWeek edge cases', () => {
  const roster = (roster_id: number, owner_id: string | null, co_owners: string[] | null = null) =>
    ({
      roster_id,
      owner_id,
      co_owners,
      players: [`p${roster_id}`],
      settings: { wins: 1, losses: 0, ties: 0, fpts: 100 },
    }) satisfies SleeperRoster
  const entry = (roster_id: number, matchup_id: number | null, points: number) =>
    ({
      roster_id,
      matchup_id,
      points,
      players: [`p${roster_id}`],
      players_points: { [`p${roster_id}`]: points },
      starters: [`p${roster_id}`, '0'],
    }) satisfies SleeperMatchup
  const users: SleeperLeagueUser[] = [
    { user_id: 'me', display_name: 'Me', metadata: null },
    { user_id: 'them', display_name: 'Them', metadata: { team_name: '' } },
  ]
  const rosters = [roster(1, 'me'), roster(2, 'them'), roster(3, null)]

  it('pairs me with the other team that has my matchup_id', () => {
    const week = toLeagueWeek('L', 1, 'me', rosters, users, [entry(1, 7, 10), entry(2, 7, 20), entry(3, 8, 99)])
    expect(week.matchup).toMatchObject({ myPoints: 10, opponent: { displayName: 'Them', points: 20 } })
  })

  it('treats an empty team name as no team name', () => {
    const week = toLeagueWeek('L', 1, 'me', rosters, users, [entry(1, 7, 10), entry(2, 7, 20)])
    expect(week.matchup?.opponent?.teamName).toBeNull()
  })

  it('does not pair two teams just because both have no game', () => {
    const week = toLeagueWeek('L', 1, 'me', rosters, users, [entry(1, null, 10), entry(2, null, 20)])
    expect(week.matchup).toMatchObject({ myPoints: 10, opponent: null })
  })

  it('names an opponent with no owner as unknown (null)', () => {
    const week = toLeagueWeek('L', 1, 'me', rosters, users, [entry(1, 7, 10), entry(3, 7, 20)])
    expect(week.matchup?.opponent).toEqual({ displayName: null, teamName: null, points: 20 })
  })

  it('counts a co-owner as an owner', () => {
    const coOwned = [roster(1, 'someone', ['me']), roster(2, 'them')]
    const week = toLeagueWeek('L', 1, 'me', coOwned, users, [entry(1, 7, 10), entry(2, 7, 20)])
    expect(week.matchup?.myPoints).toBe(10)
  })

  it('gives nothing when I have no team in the league', () => {
    const week = toLeagueWeek('L', 1, 'stranger', rosters, users, [entry(1, 7, 10), entry(2, 7, 20)])
    expect(week).toMatchObject({ matchup: null, myPlayers: [], season: null })
  })

  it('skips empty lineup slots, which Sleeper marks as "0"', () => {
    const week = toLeagueWeek('L', 1, 'me', rosters, users, [entry(1, 7, 10), entry(2, 7, 20)])
    expect(week.myPlayers).toEqual([{ playerId: 'p1', points: 10, isStarter: true }])
  })
})
