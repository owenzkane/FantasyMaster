// Our own data shapes. The UI only ever sees these, never a platform's raw JSON.

export type PlatformId = 'sleeper' | 'espn'

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
  // Which team is mine. Sleeper: my user ID (teams are found by owner). ESPN: my team's ID.
  myTeamId: string
  pointsPerReception: number
  // points per stat, keyed by Sleeper's stat names, e.g. { rec: 0.5, rec_yd: 0.1, rec_td: 6 }.
  // null when a platform's rules can't be expressed in those names at all.
  scoring: Record<string, number> | null
  // how many of the league's offensive scoring rules are missing from `scoring` (ESPN rules
  // with no translation). Above zero, anything calculated from `scoring` is approximate.
  scoringGaps: number
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

// My team's season so far
export interface SeasonRecord {
  wins: number
  losses: number
  ties: number
  pointsFor: number
}

export interface LeagueMember {
  // Unique across platforms: "sleeper:<user id>" or "espn:<member id>". The same person has
  // the same ID in every league on one platform, but nothing ties a Sleeper ID to an ESPN one.
  id: string
  displayName: string
  // the person's own name. ESPN provides it; Sleeper doesn't, so it's null there.
  realName: string | null
  // what they call their team in this league; null if they haven't named it
  teamName: string | null
  isMe: boolean
}

// Everything we need about one league for one week
export interface LeagueWeek {
  // null when the user has no team in that league, or the league has no games that week
  matchup: Matchup | null
  // starters first, in lineup order, then the bench
  myPlayers: PlayerPoints[]
  // empty when there is no opponent
  opponentPlayers: PlayerPoints[]
  // The last two describe the season as it stands today, whichever week was asked for.
  // They're here because the same requests that answer the week already contain them.
  // null when I have no team in the league
  season: SeasonRecord | null
  members: LeagueMember[]
}

export interface PlayerInfo {
  name: string
  position: string | null
  team: string | null
  // the same player's ID on ESPN, when Sleeper knows it
  espnId?: number
}

// Player details by player ID. An ID can be missing if the saved list is out of date.
export type PlayerDirectory = Record<string, PlayerInfo>

// One player's stats for one week, keyed by Sleeper's stat names, e.g. { rec: 6, rec_yd: 80 }
export type StatLine = Record<string, number>

// Every player's stat line for one week, by player ID. Players who didn't play are missing.
export type WeekStats = Record<string, StatLine>

// The one thing every fantasy platform must be able to do: describe a league's week.
export interface FantasyPlatform {
  getLeagueWeek(league: League, week: number): Promise<LeagueWeek>
}

// Facts about the NFL itself, the same whatever platform a league is on.
export interface NflSource {
  getCurrentWeek(): Promise<SeasonWeek>
  getPlayerDirectory(): Promise<PlayerDirectory>
  getWeekStats(season: string, week: number): Promise<WeekStats>
}

// Sleeper links by username: one username leads to all of that user's leagues.
export interface SleeperSource extends FantasyPlatform, NflSource {
  // null when no user has that username
  getUser(username: string): Promise<User | null>
  getLeagues(userId: string, season: string): Promise<League[]>
}

export interface TeamChoice {
  id: string
  name: string
  ownerName: string | null
}

// An ESPN league before we know which team is mine
export interface EspnLeagueChoice {
  league: Omit<League, 'myTeamId'>
  teams: TeamChoice[]
}

// Why an ESPN league couldn't be read. The three "private" ones are: the app is running
// without the dev server's proxy; the proxy has no login cookies; ESPN refused the cookies.
export type EspnProblem = 'notFound' | 'privateNoProxy' | 'privateNoCookies' | 'privateRejected'

export type EspnFindResult =
  | { ok: true; choice: EspnLeagueChoice }
  | { ok: false; problem: EspnProblem }

// ESPN has no lookup by username: leagues are linked one at a time by ID, then a team is picked.
export interface EspnSource extends FantasyPlatform {
  findLeague(leagueId: string, season: string): Promise<EspnFindResult>
}
