import { beforeAll, describe, expect, it } from 'vitest'
import { loadDemo, sumStarters } from '../../testing/demo.ts'
import { projector, toLeagueWeek } from './sleeperPlatform.ts'
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
    expect(demo.league('Demo League 1').matchup?.opponent).toMatchObject({
      displayName: 'manager_6',
      teamName: 'Team 6',
      points: 150.75,
    })
  })

  it('finds my own team name as well as my opponent’s', () => {
    expect(demo.league('Demo League 1').matchup?.myTeamName).toBe('Team 1')
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

  it('projects each team’s score by scoring Sleeper’s projected stat lines per league', () => {
    const projected = demo.sleeper.map(({ league, matchup }) => [
      league.name,
      matchup?.myProjected ?? null,
      matchup?.opponent?.projected ?? null,
    ])
    expect(projected).toEqual([
      ['Demo League 1', 144.18, 121.67],
      ['Demo League 2', 101.36, 110.92],
      ['Demo League 3', 97.66, 93.13],
      ['Demo League 4', 118.21, 100.33],
      ['Demo League 5', 159.53, 130.27],
      ['Demo League 6', 103.99, 152.75],
      ['Demo League 7 (bye week)', 100.33, null],
      ['Demo League 8 (not drafted)', null, null],
    ])
  })

  it('projects the same player differently in leagues with different scoring', () => {
    const lawrence = demo.playerId('Trevor Lawrence')
    const projectedIn = (name: string) =>
      [...demo.league(name).myPlayers, ...demo.league(name).opponentPlayers].find(
        (player) => player.playerId === lawrence,
      )?.projected
    // faced in League 2, started in Leagues 4 and 5
    expect([
      projectedIn('Demo League 2'),
      projectedIn('Demo League 4'),
      projectedIn('Demo League 5'),
    ]).toEqual([19.47, 22.69, 32.29])
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
    expect(week.matchup?.myTeamName).toBeNull()
  })

  it('finds my team name when I am only a co-owner, through the roster’s owner', () => {
    const named = [
      { user_id: 'owner', display_name: 'Owner', metadata: { team_name: 'Shared Team' } },
      ...users,
    ]
    const coOwned = [roster(1, 'owner', ['me']), roster(2, 'them')]
    const week = toLeagueWeek('L', 1, 'me', coOwned, named, [entry(1, 7, 10), entry(2, 7, 20)])
    expect(week.matchup?.myTeamName).toBe('Shared Team')
  })

  it('does not pair two teams just because both have no game', () => {
    const week = toLeagueWeek('L', 1, 'me', rosters, users, [entry(1, null, 10), entry(2, null, 20)])
    expect(week.matchup).toMatchObject({ myPoints: 10, opponent: null })
  })

  it('names an opponent with no owner as unknown (null)', () => {
    const week = toLeagueWeek('L', 1, 'me', rosters, users, [entry(1, 7, 10), entry(3, 7, 20)])
    expect(week.matchup?.opponent).toEqual({
      displayName: null,
      teamName: null,
      points: 20,
      projected: null,
    })
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

  it('has no projections unless it is given a way to project', () => {
    const entries = [entry(1, 7, 10), entry(2, 7, 20)]
    const without = toLeagueWeek('L', 1, 'me', rosters, users, entries)
    expect(without.matchup).toMatchObject({ myProjected: null, opponent: { projected: null } })

    const project = projector({ p1: { rec: 5, rec_yd: 50 } }, { rec: 1, rec_yd: 0.1 })
    const withProjections = toLeagueWeek('L', 1, 'me', rosters, users, entries, project)
    // 5 catches + 5.0 for the yards. The opponent's player has no projected line.
    expect(withProjections.myPlayers[0].projected).toBe(10)
    expect(withProjections.matchup).toMatchObject({ myProjected: 10, opponent: { projected: null } })
  })

  it('projects a team from games already played when it is given the scoreboard', () => {
    const entries = [entry(1, 7, 10), entry(2, 7, 20)]
    const project = projector(
      { p1: { rec: 25 }, p2: { rec: 30 } },
      { rec: 1 },
    )
    const directory = {
      p1: { name: 'One', position: 'WR', team: 'AAA' },
      p2: { name: 'Two', position: 'WR', team: 'BBB' },
    }
    const games = {
      AAA: { state: 'post' as const, fractionRemaining: 0 },
      BBB: { state: 'in' as const, fractionRemaining: 0.5 },
    }
    const week = toLeagueWeek('L', 1, 'me', rosters, users, entries, project, { games, directory })
    // Mine is over, so what he scored (10), not his 25 projection. Theirs is half done:
    // 20 scored plus half of a 30-point projection.
    expect(week.matchup).toMatchObject({ myProjected: 10, opponent: { projected: 35 } })
    // each player's own projection is still the one from before the games
    expect(week.myPlayers[0].projected).toBe(25)
  })

  it('skips empty lineup slots, which Sleeper marks as "0"', () => {
    const week = toLeagueWeek('L', 1, 'me', rosters, users, [entry(1, 7, 10), entry(2, 7, 20)])
    expect(week.myPlayers).toEqual([
      { playerId: 'p1', points: 10, projected: null, isStarter: true },
    ])
  })
})
