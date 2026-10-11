// Sleeper's implementation of FantasyPlatform: fetch raw JSON, convert it to our types.

import { pointsFor, projectedTotal, round2 } from '../scoring.ts'
import type { League, LeagueWeek, PlayerPoints, SleeperSource, WeekStats } from '../types.ts'
import {
  fetchLeagues,
  fetchLeagueUsers,
  fetchMatchups,
  fetchPlayerDirectory,
  fetchRosters,
  fetchState,
  fetchUser,
  fetchWeekProjections,
  fetchWeekStats,
} from './sleeperApi.ts'
import type {
  SleeperLeague,
  SleeperLeagueUser,
  SleeperMatchup,
  SleeperRoster,
} from './sleeperTypes.ts'

export function toLeague(league: SleeperLeague, userId: string): League {
  return {
    id: league.league_id,
    platform: 'sleeper',
    name: league.name,
    season: league.season,
    teamCount: league.total_rosters,
    myTeamId: userId,
    pointsPerReception: league.scoring_settings.rec ?? 0,
    scoring: league.scoring_settings,
    scoringGaps: 0,
  }
}

// Gives a player's projected points in one league, or null if he has no projection
type Project = (playerId: string) => number | null

// Sleeper projects stat lines, not points, so the same scoring formula used for real stats
// turns a projected line into projected points under each league's own rules.
export function projector(projections: WeekStats, scoring: League['scoring']): Project {
  return (playerId) => {
    const line = projections[playerId]
    return line && scoring ? round2(pointsFor(line, scoring)) : null
  }
}

// A team's name is set by its owner, so it's found through the owner's league membership.
// Several IDs are tried in order, since I may be a co-owner whose own ID isn't the roster's owner.
function teamNameOf(users: SleeperLeagueUser[], ...userIds: (string | null)[]) {
  for (const userId of userIds) {
    const teamName = users.find((user) => user.user_id === userId)?.metadata?.team_name
    if (teamName) return teamName
  }
  return null
}

// One team's players for the week: starters first in lineup order, then the bench.
function toPlayers(entry: SleeperMatchup, project: Project): PlayerPoints[] {
  const starters = (entry.starters ?? []).filter((playerId) => playerId !== '0')
  const bench = (entry.players ?? []).filter((playerId) => !starters.includes(playerId))
  const toPlayer = (playerId: string, isStarter: boolean): PlayerPoints => ({
    playerId,
    points: entry.players_points?.[playerId] ?? null,
    projected: project(playerId),
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
  project: Project = () => null,
): LeagueWeek {
  const members = users.map((user) => ({
    id: `sleeper:${user.user_id}`,
    displayName: user.display_name,
    realName: null,
    teamName: user.metadata?.team_name || null,
    isMe: user.user_id === userId,
  }))

  const myRoster = rosters.find(
    (roster) => roster.owner_id === userId || roster.co_owners?.includes(userId),
  )
  if (!myRoster) {
    return { matchup: null, myPlayers: [], opponentPlayers: [], season: null, members }
  }

  const { wins, losses, ties, fpts, fpts_decimal } = myRoster.settings
  const season = { wins, losses, ties, pointsFor: fpts + (fpts_decimal ?? 0) / 100 }

  const mine = matchups.find((entry) => entry.roster_id === myRoster.roster_id)
  if (!mine) {
    // No entry for the week, so fall back to my current roster with no scores
    const players = myRoster.players ?? []
    return {
      matchup: null,
      myPlayers: players.map((playerId) => ({
        playerId,
        points: null,
        projected: project(playerId),
        isStarter: false,
      })),
      opponentPlayers: [],
      season,
      members,
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
  const myPlayers = toPlayers(mine, project)
  const opponentPlayers = opponent ? toPlayers(opponent, project) : []
  return {
    matchup: {
      leagueId,
      week,
      myPoints: mine.points,
      myProjected: projectedTotal(myPlayers),
      myTeamName: teamNameOf(users, userId, myRoster.owner_id),
      opponent: opponent
        ? {
            displayName: opponentUser?.display_name ?? null,
            teamName: opponentUser?.metadata?.team_name || null,
            points: opponent.points,
            projected: projectedTotal(opponentPlayers),
          }
        : null,
    },
    myPlayers,
    opponentPlayers,
    season,
    members,
  }
}

export const sleeperPlatform: SleeperSource = {
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
    return leagues.map((league) => toLeague(league, userId))
  },

  async getLeagueWeek(league, week) {
    // The four calls don't depend on each other, so run them at the same time
    const [rosters, users, matchups, projections] = await Promise.all([
      fetchRosters(league.id),
      fetchLeagueUsers(league.id),
      fetchMatchups(league.id, week),
      fetchWeekProjections(league.season, week),
    ])
    const project = projector(projections, league.scoring)
    return toLeagueWeek(league.id, week, league.myTeamId, rosters, users, matchups, project)
  },

  getPlayerDirectory() {
    return fetchPlayerDirectory()
  },

  getWeekStats(season, week) {
    return fetchWeekStats(season, week)
  },
}
