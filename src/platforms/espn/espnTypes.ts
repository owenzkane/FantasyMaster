// Shapes of ESPN's raw JSON, using ESPN's own field names.
// Only the fields we read are listed; the real responses have many more.
// One address returns different parts of a league depending on its `view` parameters,
// so every part beyond the basics is optional.

export interface EspnLeagueResponse {
  id: number
  seasonId: number
  // view=mSettings
  settings?: {
    name: string
    size: number
    scoringSettings: { scoringItems: EspnScoringItem[] }
  }
  // view=mTeam
  teams?: EspnTeam[]
  members?: EspnMember[]
  // view=mBoxscore
  schedule?: EspnMatchup[]
}

export interface EspnScoringItem {
  // ESPN numbers its stats: 53 is receptions, 3 is passing yards
  statId: number
  points: number
}

export interface EspnTeam {
  id: number
  name: string
  // a member's id
  primaryOwner?: string
  // every member who runs the team, primary owner included
  owners?: string[]
  record?: { overall: { wins: number; losses: number; ties: number; pointsFor: number } }
}

export interface EspnMember {
  id: string
  // often an auto-generated handle like "ESPNfan5727155805"
  displayName: string
  firstName?: string
  lastName?: string
}

// One game. Unlike Sleeper, both teams are already in the same object.
export interface EspnMatchup {
  matchupPeriodId: number
  home: EspnMatchupSide
  // missing when the home team has a bye
  away?: EspnMatchupSide
}

export interface EspnMatchupSide {
  teamId: number
  totalPoints: number
  rosterForCurrentScoringPeriod?: {
    // the starters' points added up, kept current while games are being played
    appliedStatTotal: number
    entries: EspnRosterEntry[]
  }
}

export interface EspnRosterEntry {
  // which lineup slot he's in: 20 is the bench, 21 is injured reserve
  lineupSlotId: number
  playerPoolEntry: {
    // his points for the week in this league's scoring
    appliedStatTotal: number
    player: EspnPlayer
  }
}

export interface EspnPlayer {
  // ESPN's own player ID; negative for team defenses
  id: number
  fullName: string
  // 1 QB, 2 RB, 3 WR, 4 TE, 5 K, 16 D/ST
  defaultPositionId: number
  // ESPN's number for his NFL team
  proTeamId: number
}
