// Shapes of Sleeper's raw JSON, using Sleeper's own field names.
// Only the fields we read are listed; the real responses have many more.

// GET /user/{username}
export interface SleeperUser {
  user_id: string
  username: string
  display_name: string
}

// GET /state/nfl
export interface SleeperState {
  season: string
  week: number
}

// GET /user/{user_id}/leagues/nfl/{season} returns SleeperLeague[]
export interface SleeperLeague {
  league_id: string
  name: string
  season: string
  total_rosters: number
}

// GET /league/{league_id}/rosters returns SleeperRoster[]
export interface SleeperRoster {
  roster_id: number
  // null when the team has no owner yet
  owner_id: string | null
  co_owners: string[] | null
  // the team's current players; null before the league has drafted
  players: string[] | null
}

// GET /league/{league_id}/users returns SleeperLeagueUser[]
export interface SleeperLeagueUser {
  user_id: string
  display_name: string
  // team_name is only present once the owner has set one
  metadata: { team_name?: string } | null
}

// GET /league/{league_id}/matchups/{week} returns SleeperMatchup[], one entry per team
export interface SleeperMatchup {
  roster_id: number
  // shared by the two teams playing each other; null when a team has no game
  matchup_id: number | null
  points: number
  // the team's players that week, and each one's points in this league's scoring
  players: string[] | null
  players_points: Record<string, number> | null
  // player IDs in lineup order; an empty lineup slot is "0"
  starters: string[] | null
}
