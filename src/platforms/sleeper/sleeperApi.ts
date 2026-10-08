// Raw calls to Sleeper, one function per endpoint. No conversion happens here.

import type { PlayerDirectory } from '../types.ts'
import type {
  SleeperLeague,
  SleeperMatchup,
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

export function fetchMatchups(leagueId: string, week: number) {
  return getJson<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`)
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
