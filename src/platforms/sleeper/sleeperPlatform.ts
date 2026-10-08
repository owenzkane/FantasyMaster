// Sleeper's implementation of FantasyPlatform: fetch raw JSON, convert it to our types.

import type { FantasyPlatform, League, Matchup } from '../types.ts'
import { fetchLeagues, fetchMatchups, fetchRosters, fetchState, fetchUser } from './sleeperApi.ts'
import type { SleeperLeague, SleeperMatchup, SleeperRoster } from './sleeperTypes.ts'

export function toLeague(league: SleeperLeague): League {
  return {
    id: league.league_id,
    platform: 'sleeper',
    name: league.name,
    season: league.season,
    teamCount: league.total_rosters,
  }
}

// Works out one user's matchup from a league's rosters and one week's matchup entries.
export function toMatchup(
  leagueId: string,
  week: number,
  userId: string,
  rosters: SleeperRoster[],
  matchups: SleeperMatchup[],
): Matchup | null {
  const myRoster = rosters.find(
    (roster) => roster.owner_id === userId || roster.co_owners?.includes(userId),
  )
  if (!myRoster) return null

  const mine = matchups.find((entry) => entry.roster_id === myRoster.roster_id)
  if (!mine) return null

  // matchup_id is null when I have no game, and two nulls must not count as a pairing
  const opponent =
    mine.matchup_id === null
      ? undefined
      : matchups.find(
          (entry) => entry.matchup_id === mine.matchup_id && entry.roster_id !== mine.roster_id,
        )

  return {
    leagueId,
    week,
    myPoints: mine.points,
    opponentPoints: opponent ? opponent.points : null,
  }
}

export const sleeperPlatform: FantasyPlatform = {
  async getUser(username) {
    const user = await fetchUser(username)
    if (!user) return null
    return { id: user.user_id, displayName: user.display_name }
  },

  async getCurrentWeek() {
    const state = await fetchState()
    return { season: state.season, week: state.week }
  },

  async getLeagues(userId, season) {
    const leagues = await fetchLeagues(userId, season)
    return leagues.map(toLeague)
  },

  async getMatchup(leagueId, userId, week) {
    // The two calls don't depend on each other, so run them at the same time
    const [rosters, matchups] = await Promise.all([
      fetchRosters(leagueId),
      fetchMatchups(leagueId, week),
    ])
    return toMatchup(leagueId, week, userId, rosters, matchups)
  },
}
