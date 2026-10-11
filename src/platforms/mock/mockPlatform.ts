// Stand-ins for Sleeper and ESPN that answer from the saved JSON in ./fixtures instead of the
// network. The fixtures are raw platform responses, so the real conversion functions are reused.

import type { EspnLeagueResponse } from '../espn/espnTypes.ts'
import { toEspnLeagueChoice, toEspnLeagueWeek } from '../espn/espnPlatform.ts'
import { fetchPlayerDirectory } from '../sleeper/sleeperApi.ts'
import { toLeague, toLeagueWeek } from '../sleeper/sleeperPlatform.ts'
import type {
  SleeperLeague,
  SleeperLeagueUser,
  SleeperMatchup,
  SleeperRoster,
  SleeperState,
  SleeperUser,
} from '../sleeper/sleeperTypes.ts'
import type { EspnSource, SleeperSource, WeekStats } from '../types.ts'

// Week 4 is the finished week in the fixtures; week 5 was saved before any games
const MOCK_WEEK = 4

// Vite loads every fixture at build time, keyed by path, e.g. './fixtures/user.json'
const fixtures = import.meta.glob('./fixtures/*.json', { eager: true, import: 'default' })

function fixture<T>(name: string): T | undefined {
  return fixtures[`./fixtures/${name}.json`] as T | undefined
}

export const mockSleeper: SleeperSource = {
  async getUser(username) {
    const user = fixture<SleeperUser>('user')!
    if (username.toLowerCase() !== user.username) return null
    return { id: user.user_id, displayName: user.display_name }
  },

  async getCurrentWeek() {
    const state = fixture<SleeperState>('state')!
    return { season: state.season, week: MOCK_WEEK }
  },

  async getLeagues(userId, season) {
    const leagues = fixture<SleeperLeague[]>('leagues')!
    if (userId !== fixture<SleeperUser>('user')!.user_id) return []
    return leagues
      .filter((league) => league.season === season)
      .map((league) => toLeague(league, userId))
  },

  async getLeagueWeek(league, week) {
    const rosters = fixture<SleeperRoster[]>(`rosters-${league.id}`) ?? []
    const users = fixture<SleeperLeagueUser[]>(`users-${league.id}`) ?? []
    const matchups = fixture<SleeperMatchup[]>(`matchups-${league.id}-week${week}`) ?? []
    return toLeagueWeek(league.id, week, league.myTeamId, rosters, users, matchups)
  },

  // The player list is already a local file, so the mock loads the same one
  getPlayerDirectory() {
    return fetchPlayerDirectory()
  },

  async getWeekStats(_season, week) {
    return fixture<WeekStats>(`stats-week${week}`) ?? {}
  },
}

// Pretends to be a private league with no cookies set up, to show that message offline
const MOCK_PRIVATE_LEAGUE_ID = '2000000002'

export const mockEspn: EspnSource = {
  async findLeague(leagueId) {
    if (leagueId === MOCK_PRIVATE_LEAGUE_ID) return { ok: false, problem: 'privateNoCookies' }
    const response = fixture<EspnLeagueResponse>(`espn-${leagueId}`)
    const choice = response ? toEspnLeagueChoice(response) : null
    return choice ? { ok: true, choice } : { ok: false, problem: 'notFound' }
  },

  async getLeagueWeek(league, week) {
    const response = fixture<EspnLeagueResponse>(`espn-${league.id}-week${week}`)
    if (!response) return { matchup: null, myPlayers: [], opponentPlayers: [] }
    return toEspnLeagueWeek(league, week, response, await fetchPlayerDirectory())
  },
}
