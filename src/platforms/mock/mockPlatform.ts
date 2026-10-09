// A FantasyPlatform that answers from the saved JSON in ./fixtures instead of the network.
// The fixtures are Sleeper-shaped, so it reuses Sleeper's conversion functions.

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
import type { FantasyPlatform } from '../types.ts'

// Week 4 is the finished week in the fixtures; week 5 was saved before any games
const MOCK_WEEK = 4

// Vite loads every fixture at build time, keyed by path, e.g. './fixtures/user.json'
const fixtures = import.meta.glob('./fixtures/*.json', { eager: true, import: 'default' })

function fixture<T>(name: string): T | undefined {
  return fixtures[`./fixtures/${name}.json`] as T | undefined
}

export const mockPlatform: FantasyPlatform = {
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
    return leagues.filter((league) => league.season === season).map(toLeague)
  },

  async getLeagueWeek(leagueId, userId, week) {
    const rosters = fixture<SleeperRoster[]>(`rosters-${leagueId}`) ?? []
    const users = fixture<SleeperLeagueUser[]>(`users-${leagueId}`) ?? []
    const matchups = fixture<SleeperMatchup[]>(`matchups-${leagueId}-week${week}`) ?? []
    return toLeagueWeek(leagueId, week, userId, rosters, users, matchups)
  },

  // The player list is already a local file, so the mock loads the same one
  getPlayerDirectory() {
    return fetchPlayerDirectory()
  },
}
