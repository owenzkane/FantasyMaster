// Sleeper's implementation of FantasyPlatform: fetch raw JSON, convert it to our types.

import type { FantasyPlatform, League, LeagueWeek, PlayerPoints } from '../types.ts'
import {
  fetchLeagues,
  fetchLeagueUsers,
  fetchMatchups,
  fetchPlayerDirectory,
  fetchRosters,
  fetchState,
  fetchUser,
} from './sleeperApi.ts'
import type {
  SleeperLeague,
  SleeperLeagueUser,
  SleeperMatchup,
  SleeperRoster,
} from './sleeperTypes.ts'

export function toLeague(league: SleeperLeague): League {
  return {
    id: league.league_id,
    platform: 'sleeper',
    name: league.name,
    season: league.season,
    teamCount: league.total_rosters,
    scoring: league.scoring_settings,
  }
}

// One team's players for the week: starters first in lineup order, then the bench.
function toPlayers(entry: SleeperMatchup): PlayerPoints[] {
  const starters = (entry.starters ?? []).filter((playerId) => playerId !== '0')
  const bench = (entry.players ?? []).filter((playerId) => !starters.includes(playerId))
  const toPlayer = (playerId: string, isStarter: boolean): PlayerPoints => ({
    playerId,
    points: entry.players_points?.[playerId] ?? null,
    isStarter,
  })
  return [
    ...starters.map((playerId) => toPlayer(playerId, true)),
    ...bench.map((playerId) => toPlayer(playerId, false)),
  ]
}

// Works out one user's matchup and both teams' players from a league's rosters, members
// and one week's matchup entries.
export function toLeagueWeek(
  leagueId: string,
  week: number,
  userId: string,
  rosters: SleeperRoster[],
  users: SleeperLeagueUser[],
  matchups: SleeperMatchup[],
): LeagueWeek {
  const myRoster = rosters.find(
    (roster) => roster.owner_id === userId || roster.co_owners?.includes(userId),
  )
  if (!myRoster) return { matchup: null, myPlayers: [], opponentPlayers: [] }

  const mine = matchups.find((entry) => entry.roster_id === myRoster.roster_id)
  if (!mine) {
    // No entry for the week, so fall back to my current roster with no scores
    const players = myRoster.players ?? []
    return {
      matchup: null,
      myPlayers: players.map((playerId) => ({ playerId, points: null, isStarter: false })),
      opponentPlayers: [],
    }
  }

  // matchup_id is null when I have no game, and two nulls must not count as a pairing
  const opponent =
    mine.matchup_id === null
      ? undefined
      : matchups.find(
          (entry) => entry.matchup_id === mine.matchup_id && entry.roster_id !== mine.roster_id,
        )

  // Naming the opponent takes two more hops: entry -> roster (owner_id) -> league member
  const opponentRoster = rosters.find((roster) => roster.roster_id === opponent?.roster_id)
  const opponentUser = users.find((user) => user.user_id === opponentRoster?.owner_id)

  // An entry's own player list is the team as it was that week, which can differ from today's
  return {
    matchup: {
      leagueId,
      week,
      myPoints: mine.points,
      opponent: opponent
        ? {
            displayName: opponentUser?.display_name ?? null,
            teamName: opponentUser?.metadata?.team_name || null,
            points: opponent.points,
          }
        : null,
    },
    myPlayers: toPlayers(mine),
    opponentPlayers: opponent ? toPlayers(opponent) : [],
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
    // The three calls don't depend on each other, so run them at the same time
    const [rosters, users, matchups] = await Promise.all([
      fetchRosters(leagueId),
      fetchLeagueUsers(leagueId),
      fetchMatchups(leagueId, week),
    ])
    return toLeagueWeek(leagueId, week, userId, rosters, users, matchups)
  },

  getPlayerDirectory() {
    return fetchPlayerDirectory()
  },
}
