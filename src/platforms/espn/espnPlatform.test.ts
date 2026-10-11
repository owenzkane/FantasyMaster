import { beforeAll, describe, expect, it } from 'vitest'
import { DEMO_ESPN_LEAGUE_ID, loadDemo, loadEveryTeam, sumStarters } from '../../testing/demo.ts'
import { mockEspn } from '../mock/mockPlatform.ts'
import { toEspnLeagueWeek } from './espnPlatform.ts'
import type { EspnLeagueResponse } from './espnTypes.ts'

// The raw week 4 response, for building edge cases by editing a copy
const fixtures = import.meta.glob<EspnLeagueResponse>('../mock/fixtures/espn-*-week4.json', {
  eager: true,
  import: 'default',
})
const rawWeek4 = Object.values(fixtures)[0]

let demo: Awaited<ReturnType<typeof loadDemo>>
beforeAll(async () => {
  demo = await loadDemo()
})

describe('finding an ESPN league', () => {
  it('describes the league and lists its teams with their owners', async () => {
    const found = await mockEspn.findLeague(DEMO_ESPN_LEAGUE_ID, '2026')
    if (!found.ok) throw new Error('expected the league to be found')
    expect(found.choice.league).toMatchObject({
      id: DEMO_ESPN_LEAGUE_ID,
      platform: 'espn',
      name: 'Demo ESPN League',
      season: '2026',
      teamCount: 8,
      pointsPerReception: 1,
      scoringGaps: 0,
    })
    expect(found.choice.teams).toHaveLength(8)
    expect(found.choice.teams[0]).toEqual({ id: '1', name: 'ESPN Team 1', ownerName: 'espn_manager_5' })
  })

  it('reports a league that doesn’t exist', async () => {
    expect(await mockEspn.findLeague('123', '2026')).toEqual({ ok: false, problem: 'notFound' })
  })

  it('reports a private league with no cookies set up', async () => {
    expect(await mockEspn.findLeague('2000000002', '2026')).toEqual({
      ok: false,
      problem: 'privateNoCookies',
    })
  })
})

describe('the ESPN league from the fixtures (week 4)', () => {
  it('finds my score, my opponent’s score and who they are', () => {
    expect(demo.espn.matchup).toEqual({
      leagueId: DEMO_ESPN_LEAGUE_ID,
      week: 4,
      myPoints: 137.94,
      myProjected: 131.11,
      myTeamName: 'ESPN Team 1',
      opponent: {
        displayName: 'espn_manager_1',
        teamName: 'ESPN Team 3',
        points: 168.9,
        projected: 121.65,
      },
    })
  })

  it('lists nine starters a side whose points add up to the totals', () => {
    const { matchup, myPlayers, opponentPlayers } = demo.espn
    expect(myPlayers.filter((player) => player.isStarter)).toHaveLength(9)
    expect(opponentPlayers.filter((player) => player.isStarter)).toHaveLength(9)
    expect(sumStarters(myPlayers)).toBe(matchup?.myPoints)
    expect(sumStarters(opponentPlayers)).toBe(matchup?.opponent?.points)
  })

  it('orders my lineup quarterback first and kicker last', () => {
    const positions = demo.espn.myPlayers
      .filter((player) => player.isStarter)
      .map((player) => demo.directory[player.playerId].position)
    expect(positions).toEqual(['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'RB', 'DEF', 'K'])
  })

  it('rounds away the floating-point noise in ESPN’s points', () => {
    for (const player of [...demo.espn.myPlayers, ...demo.espn.opponentPlayers]) {
      expect(player.points).toBe(Math.round(player.points! * 100) / 100)
    }
  })

  it('matches every player on every team to a Sleeper player', async () => {
    const teams = await loadEveryTeam(demo.espn, 4)
    const players = teams.flatMap((team) => team.myPlayers)
    expect(players.length).toBeGreaterThan(100)
    expect(players.filter((player) => !demo.directory[player.playerId])).toEqual([])
  })

  it('reads ESPN’s own projection for each player, separate from what he scored', () => {
    const quarterback = demo.espn.myPlayers[0]
    expect(demo.directory[quarterback.playerId].name).toBe('Tyler Shough')
    expect(quarterback).toMatchObject({ points: 15.94, projected: 18.6 })
    const everyone = [...demo.espn.myPlayers, ...demo.espn.opponentPlayers]
    expect(everyone.filter((player) => player.projected === null)).toEqual([])
  })

  it('reads my season record and marks which member is me', () => {
    expect(demo.espn.season).toEqual({ wins: 2, losses: 2, ties: 0, pointsFor: 515.12 })
    const me = demo.espn.members.filter((member) => member.isMe)
    expect(me).toHaveLength(1)
    expect(me[0]).toMatchObject({ realName: 'Demo Manager 5', teamName: 'ESPN Team 1' })
  })
})

describe('toEspnLeagueWeek edge cases', () => {
  it('gives a matchup with no opponent when the away side is missing (a bye)', () => {
    const bye = structuredClone(rawWeek4)
    const game = bye.schedule!.find((m) => m.home.teamId === 1 || m.away?.teamId === 1)!
    if (game.home.teamId !== 1) game.home = game.away!
    delete game.away
    const week = toEspnLeagueWeek(demo.espn.league, 4, bye, demo.directory)
    expect(week.matchup).toMatchObject({ myPoints: 137.94, opponent: null })
    expect(week.opponentPlayers).toEqual([])
  })

  it('uses ESPN’s own live projected total when it sends one', () => {
    // ESPN's figure counts games already played, so it can differ a lot from the sum of the
    // pre-game projections
    const live = structuredClone(rawWeek4)
    const game = live.schedule!.find((m) => m.home.teamId === 1 || m.away?.teamId === 1)!
    const mine = game.home.teamId === 1 ? game.home : game.away!
    const theirs = game.home.teamId === 1 ? game.away! : game.home
    mine.totalProjectedPointsLive = 127.63714812
    theirs.totalProjectedPointsLive = 149.37696324
    const week = toEspnLeagueWeek(demo.espn.league, 4, live, demo.directory)
    expect(week.matchup).toMatchObject({ myProjected: 127.64, opponent: { projected: 149.38 } })
    // while each player's own projection stays the pre-game one
    expect(week.myPlayers[0].projected).toBe(18.6)
  })

  it('gives no matchup for a week the response doesn’t contain', () => {
    expect(toEspnLeagueWeek(demo.espn.league, 9, rawWeek4, demo.directory).matchup).toBeNull()
  })

  it('gives no matchup for a team that isn’t in the league', () => {
    const stranger = { ...demo.espn.league, myTeamId: '99' }
    const week = toEspnLeagueWeek(stranger, 4, rawWeek4, demo.directory)
    expect(week).toMatchObject({ matchup: null, season: null })
  })
})
