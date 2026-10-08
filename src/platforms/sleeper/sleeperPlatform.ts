// Sleeper's implementation of FantasyPlatform: fetch raw JSON, convert it to our types.

import type { FantasyPlatform, League, LeagueWeek } from '../types.ts'
import {
  fetchLeagues,
  fetchMatchups,
  fetchPlayerDirectory,
  fetchRosters,
  fetchState,
  fetchUser,
} from './sleeperApi.ts'
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

// Works out one user's matchup and players from a league's rosters and one week's matchup entries.
export function toLeagueWeek(
  leagueId: string,
  week: number,
  userId: string,
  rosters: SleeperRoster[],
  matchups: SleeperMatchup[],
): LeagueWeek {
  const myRoster = rosters.find(
    (roster) => roster.owner_id === userId || roster.co_owners?.includes(userId),
  )
  if (!myRoster) return { matchup: null, myPlayers: [] }

  const mine = matchups.find((entry) => entry.roster_id === myRoster.roster_id)
  if (!mine) {
    // No entry for the week, so fall back to my current roster with no scores
    const players = myRoster.players ?? []
    return { matchup: null, myPlayers: players.map((playerId) => ({ playerId, points: null })) }
  }

  // matchup_id is null when I have no game, and two nulls must not count as a pairing
  const opponent =
    mine.matchup_id === null
      ? undefined
      : matchups.find(
          (entry) => entry.matchup_id === mine.matchup_id && entry.roster_id !== mine.roster_id,
        )

  // The entry's own player list is my roster as it was that week, which can differ from today's
  const players = mine.players ?? []
  return {
    matchup: {
      leagueId,
      week,
      myPoints: mine.points,
      opponentPoints: opponent ? opponent.points : null,
    },
    myPlayers: players.map((playerId) => ({
      playerId,
      points: mine.players_points?.[playerId] ?? null,
    })),
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

  async getLeagueWeek(leagueId, userId, week) {
    // The two calls don't depend on each other, so run them at the same time
    const [rosters, matchups] = await Promise.all([
      fetchRosters(leagueId),
      fetchMatchups(leagueId, week),
    ])
    return toLeagueWeek(leagueId, week, userId, rosters, matchups)
  },

  getPlayerDirectory() {
    return fetchPlayerDirectory()
  },
}
