// Loads the mock data the way the app does, for tests to check results against.
// Everything comes from the saved fixtures: demo_user's eight Sleeper leagues and one ESPN league.

import type { LeagueSummary } from '../hooks/useLeagues.ts'
import { mockEspn, mockSleeper } from '../platforms/mock/mockPlatform.ts'
import type { FantasyPlatform, League } from '../platforms/types.ts'

export const DEMO_ESPN_LEAGUE_ID = '1000000001'

function platformFor(league: League): FantasyPlatform {
  return league.platform === 'espn' ? mockEspn : mockSleeper
}

export async function loadWeek(league: League, week: number): Promise<LeagueSummary> {
  return { league, ...(await platformFor(league).getLeagueWeek(league, week)) }
}

export async function loadDemo() {
  const user = (await mockSleeper.getUser('demo_user'))!
  const now = await mockSleeper.getCurrentWeek()
  const directory = await mockSleeper.getPlayerDirectory()
  const stats = await mockSleeper.getWeekStats(now.season, now.week)

  const sleeperLeagues = await mockSleeper.getLeagues(user.id, now.season)
  const found = await mockEspn.findLeague(DEMO_ESPN_LEAGUE_ID, now.season)
  if (!found.ok) throw new Error('The demo ESPN league fixture is missing')
  // In the fixture, team 1 is the team the real data was saved from
  const espnLeague: League = { ...found.choice.league, myTeamId: '1' }

  const sleeper = await Promise.all(sleeperLeagues.map((league) => loadWeek(league, now.week)))
  const espn = await loadWeek(espnLeague, now.week)

  return {
    week: now.week,
    directory,
    stats,
    sleeper,
    espn,
    all: [...sleeper, espn],
    // Looks a league up by its name, e.g. league('Demo League 1')
    league(name: string) {
      const summary = [...sleeper, espn].find((row) => row.league.name === name)
      if (!summary) throw new Error(`No demo league named ${name}`)
      return summary
    },
    // Looks a player up by name among the players who have stats this week
    playerId(name: string) {
      const id = Object.keys(stats).find((key) => directory[key]?.name === name)
      if (!id) throw new Error(`No demo player named ${name}`)
      return id
    },
  }
}

// Every team in a league, each loaded as if it were mine. Lets a test check all rosters,
// not only my matchup.
export async function loadEveryTeam(summary: LeagueSummary, week: number) {
  const { league } = summary
  if (league.platform === 'espn') {
    const found = await mockEspn.findLeague(league.id, league.season)
    if (!found.ok) return []
    return Promise.all(
      found.choice.teams.map((team) => loadWeek({ ...league, myTeamId: team.id }, week)),
    )
  }
  return Promise.all(
    summary.members.map((member) =>
      loadWeek({ ...league, myTeamId: member.id.replace('sleeper:', '') }, week),
    ),
  )
}

export function sumStarters(players: LeagueSummary['myPlayers']) {
  const total = players
    .filter((player) => player.isStarter)
    .reduce((sum, player) => sum + (player.points ?? 0), 0)
  return Math.round(total * 100) / 100
}
