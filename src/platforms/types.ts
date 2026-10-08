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
}

export interface Matchup {
  leagueId: string
  week: number
  myPoints: number
  // null when I have no opponent this week (bye, or a league without head-to-head games)
  opponentPoints: number | null
}

// The contract every platform (Sleeper now, maybe ESPN or Yahoo later) must fulfil.
export interface FantasyPlatform {
  // null when no user has that username
  getUser(username: string): Promise<User | null>
  getCurrentWeek(): Promise<SeasonWeek>
  getLeagues(userId: string, season: string): Promise<League[]>
  // null when the user has no team in that league, or the league has no games that week
  getMatchup(leagueId: string, userId: string, week: number): Promise<Matchup | null>
}
