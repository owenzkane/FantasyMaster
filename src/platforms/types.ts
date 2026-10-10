// Our own data shapes. The UI only ever sees these, never a platform's raw JSON.

export type PlatformId = 'sleeper'

export interface User {
  id: string
  displayName: string
}

export interface SeasonWeek {
  season: string
  week: number
}

export interface League {
  id: string
  platform: PlatformId
  name: string
  season: string
  teamCount: number
  // points per stat, keyed by Sleeper's stat names, e.g. { rec: 0.5, rec_yd: 0.1, rec_td: 6 }
  scoring: Record<string, number>
}

export interface Opponent {
  // null when the opposing team has no owner
  displayName: string | null
  // null when the owner hasn't named their team
  teamName: string | null
  points: number
}

export interface Matchup {
  leagueId: string
  week: number
  myPoints: number
  // null when I have no opponent this week (bye, or a league without head-to-head games)
  opponent: Opponent | null
}

// One player on one team in one league, with points in that league's scoring
export interface PlayerPoints {
  playerId: string
  // null when there are no scores for the week
  points: number | null
  // only starters count towards the team's score
  isStarter: boolean
}

// Everything we need about one league for one week
export interface LeagueWeek {
  // null when the user has no team in that league, or the league has no games that week
  matchup: Matchup | null
  // starters first, in lineup order, then the bench
  myPlayers: PlayerPoints[]
  // empty when there is no opponent
  opponentPlayers: PlayerPoints[]
}

export interface PlayerInfo {
  name: string
  position: string | null
  team: string | null
}

// Player details by player ID. An ID can be missing if the saved list is out of date.
export type PlayerDirectory = Record<string, PlayerInfo>

// One player's stats for one week, keyed by Sleeper's stat names, e.g. { rec: 6, rec_yd: 80 }
export type StatLine = Record<string, number>

// Every player's stat line for one week, by player ID. Players who didn't play are missing.
export type WeekStats = Record<string, StatLine>

// The contract every platform (Sleeper now, maybe ESPN or Yahoo later) must fulfil.
export interface FantasyPlatform {
  // null when no user has that username
  getUser(username: string): Promise<User | null>
  getCurrentWeek(): Promise<SeasonWeek>
  getLeagues(userId: string, season: string): Promise<League[]>
  getLeagueWeek(leagueId: string, userId: string, week: number): Promise<LeagueWeek>
  getPlayerDirectory(): Promise<PlayerDirectory>
  getWeekStats(season: string, week: number): Promise<WeekStats>
}
