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
  // points per stat, e.g. { rec: 0.5, rec_yd: 0.1, rec_td: 6 }
  scoring_settings: Record<string, number>
}

// GET /league/{league_id}/rosters returns SleeperRoster[]
export interface SleeperRoster {
  roster_id: number
  // null when the team has no owner yet
  owner_id: string | null
  co_owners: string[] | null
  // the team's current players; null before the league has drafted
  players: string[] | null
  // season totals. Points are split in two: fpts is the whole part, fpts_decimal the hundredths
  settings: { wins: number; losses: number; ties: number; fpts: number; fpts_decimal?: number }
}

// GET /league/{league_id}/users returns SleeperLeagueUser[]
export interface SleeperLeagueUser {
  user_id: string
  display_name: string
  // team_name is only present once the owner has set one
  metadata: { team_name?: string } | null
}

// GET api.sleeper.com/projections/nfl/{season}/{week} returns SleeperProjection[]
export interface SleeperProjection {
  player_id: string
  // his projected stat line, with the same stat names as real stats
  stats: Record<string, number>
  // his details as of today, whichever week was asked for
  player?: { injury_status?: string | null }
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
