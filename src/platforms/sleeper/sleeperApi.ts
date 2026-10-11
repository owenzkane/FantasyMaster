// Raw calls to Sleeper, one function per endpoint. No conversion happens here.

import type { InjuryStatuses, PlayerDirectory, WeekStats } from '../types.ts'
import type {
  SleeperLeague,
  SleeperLeagueUser,
  SleeperMatchup,
  SleeperProjection,
  SleeperRoster,
  SleeperState,
  SleeperUser,
} from './sleeperTypes.ts'

const BASE_URL = 'https://api.sleeper.app/v1'

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(BASE_URL + path)
  if (!response.ok) {
    throw new Error(`Sleeper request failed (${response.status}): ${path}`)
  }
  return (await response.json()) as T
}

// Sleeper answers null (with status 200) for a username that doesn't exist
export function fetchUser(username: string) {
  return getJson<SleeperUser | null>(`/user/${encodeURIComponent(username)}`)
}

export function fetchState() {
  return getJson<SleeperState>('/state/nfl')
}

export function fetchLeagues(userId: string, season: string) {
  return getJson<SleeperLeague[]>(`/user/${userId}/leagues/nfl/${season}`)
}

export function fetchRosters(leagueId: string) {
  return getJson<SleeperRoster[]>(`/league/${leagueId}/rosters`)
}

export function fetchLeagueUsers(leagueId: string) {
  return getJson<SleeperLeagueUser[]>(`/league/${leagueId}/users`)
}

export function fetchMatchups(leagueId: string, week: number) {
  return getJson<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`)
}

// Undocumented: this endpoint isn't in Sleeper's public docs, so it could change without notice
export function fetchWeekStats(season: string, week: number) {
  return getJson<WeekStats>(`/stats/nfl/regular/${season}/${week}`)
}

// One week's projections for every player, with each player's current injury status attached.
// Undocumented, and on a different address from the rest of Sleeper's API.
const PROJECTIONS_URL = 'https://api.sleeper.com/projections/nfl'

export interface WeekOutlook {
  // each player's projected stat line, in the same shape as real stats
  projections: WeekStats
  injuries: InjuryStatuses
}

// Pulls the two things we use out of Sleeper's list
export function toWeekOutlook(entries: SleeperProjection[]): WeekOutlook {
  const outlook: WeekOutlook = { projections: {}, injuries: {} }
  for (const entry of entries) {
    outlook.projections[entry.player_id] = entry.stats
    const status = entry.player?.injury_status
    if (status) outlook.injuries[entry.player_id] = status
  }
  return outlook
}

// Every Sleeper league asks for the same week, so the download is shared between them
const outlooks = new Map<string, Promise<WeekOutlook>>()

export function fetchWeekOutlook(season: string, week: number) {
  const key = `${season}-${week}`
  let request = outlooks.get(key)
  if (!request) {
    request = fetch(`${PROJECTIONS_URL}/${season}/${week}?season_type=regular`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Sleeper projections failed (${response.status})`)
        return toWeekOutlook((await response.json()) as SleeperProjection[])
      })
      .catch((): WeekOutlook => {
        // Projections and injuries are extras: without them the page still works. Forget the
        // failure so a later load tries again.
        outlooks.delete(key)
        return { projections: {}, injuries: {} }
      })
    outlooks.set(key, request)
  }
  return request
}

// Not a Sleeper call: this is our own slimmed copy of Sleeper's 14.7 MB player list,
// saved in public/ by `npm run update-players`
let playerDirectory: Promise<PlayerDirectory> | undefined

export function fetchPlayerDirectory() {
  // Keep the promise so the file is only downloaded once per page load
  playerDirectory ??= fetch(`${import.meta.env.BASE_URL}sleeper-players.json`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Could not load the player list (${response.status})`)
      }
      return response.json() as Promise<PlayerDirectory>
    })
    .catch((error) => {
      // Forget a failed download so the next search tries again
      playerDirectory = undefined
      throw error
    })
  return playerDirectory
}
