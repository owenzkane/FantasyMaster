// Stand-ins for Sleeper and ESPN that answer from the saved JSON in ./fixtures instead of the
// network. The fixtures are raw platform responses, so the real conversion functions are reused.

import type { EspnLeagueResponse } from '../espn/espnTypes.ts'
import { toEspnLeagueChoice, toEspnLeagueWeek } from '../espn/espnPlatform.ts'
import { fetchPlayerDirectory } from '../sleeper/sleeperApi.ts'
import { projector, toLeague, toLeagueWeek } from '../sleeper/sleeperPlatform.ts'
import type {
  SleeperLeague,
  SleeperLeagueUser,
  SleeperMatchup,
  SleeperRoster,
  SleeperState,
  SleeperUser,
} from '../sleeper/sleeperTypes.ts'
import type {
  EspnAccount,
  EspnSource,
  InjuryStatuses,
  SleeperSource,
  WeekStats,
} from '../types.ts'

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
    const projections = fixture<WeekStats>(`projections-week${week}`) ?? {}
    const project = projector(projections, league.scoring)
    return toLeagueWeek(league.id, week, league.myTeamId, rosters, users, matchups, project)
  },

  // The player list is already a local file, so the mock loads the same one
  getPlayerDirectory() {
    return fetchPlayerDirectory()
  },

  async getWeekStats(_season, week) {
    return fixture<WeekStats>(`stats-week${week}`) ?? {}
  },

  // The mock's week is already over, so there's nothing live. Without game information every
  // projection stays as it was before the week.
  async getLiveGames() {
    return {}
  },

  async getInjuryStatuses() {
    return fixture<InjuryStatuses>('injuries') ?? {}
  },
}

// A pretend private league: refused until the mock ESPN account is connected, then served from
// the demo ESPN league's saved data under its own ID and name. Lets the whole connect flow be
// tried offline.
const MOCK_PRIVATE_LEAGUE_ID = '2000000002'
const MOCK_PRIVATE_LEAGUE_NAME = 'Demo Private League'
const DEMO_ESPN_LEAGUE_ID = '1000000001'
let mockConnected = false

// A saved ESPN response for a league, with the private league borrowing the demo league's data
function espnFixture(leagueId: string, suffix = ''): EspnLeagueResponse | undefined {
  if (leagueId !== MOCK_PRIVATE_LEAGUE_ID) return fixture(`espn-${leagueId}${suffix}`)
  const response = fixture<EspnLeagueResponse>(`espn-${DEMO_ESPN_LEAGUE_ID}${suffix}`)
  if (!response) return undefined
  return {
    ...response,
    id: Number(MOCK_PRIVATE_LEAGUE_ID),
    settings: response.settings && { ...response.settings, name: MOCK_PRIVATE_LEAGUE_NAME },
  }
}

export const mockEspnAccount: EspnAccount = {
  async status() {
    return mockConnected ? 'connected' : 'disconnected'
  },
  // Any two non-empty values connect: there's no real ESPN to check them against
  async connect(espnS2, swid) {
    if (!espnS2.trim() || !swid.trim()) return { ok: false, message: 'Fill in both values.' }
    mockConnected = true
    return { ok: true }
  },
  async disconnect() {
    mockConnected = false
  },
}

export const mockEspn: EspnSource = {
  async findLeague(leagueId) {
    if (leagueId === MOCK_PRIVATE_LEAGUE_ID && !mockConnected) {
      return { ok: false, problem: 'privateNoCookies' }
    }
    const response = espnFixture(leagueId)
    const choice = response ? toEspnLeagueChoice(response) : null
    return choice ? { ok: true, choice } : { ok: false, problem: 'notFound' }
  },

  async getLeagueWeek(league, week) {
    const response = espnFixture(league.id, `-week${week}`)
    if (!response) {
      return { matchup: null, myPlayers: [], opponentPlayers: [], season: null, members: [] }
    }
    return toEspnLeagueWeek(league, week, response, await fetchPlayerDirectory())
  },
}
