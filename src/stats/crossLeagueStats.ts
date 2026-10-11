// Season-long numbers across every linked league: records, scoring, and who and which players
// keep turning up.

import { combinePlayers } from '../players/combinePlayers.ts'
import type { League, LeagueMember, PlayerPoints, SeasonRecord } from '../platforms/types.ts'

interface LeagueData {
  league: League
  season: SeasonRecord | null
  members: LeagueMember[]
  myPlayers: PlayerPoints[]
}

export interface LeagueRecord {
  league: League
  record: SeasonRecord
  games: number
  // null before any game has been played
  pointsPerGame: number | null
}

export interface SharedManager {
  id: string
  // their own name where the platform gives one (ESPN), otherwise their display name
  name: string
  // one entry per league we share, with what they call their team there
  leagues: { leagueName: string; teamName: string | null }[]
}

export interface SharedPlayer {
  playerId: string
  leagueCount: number
}

export interface CrossLeagueStats {
  records: LeagueRecord[]
  total: { wins: number; losses: number; ties: number; games: number; pointsPerGame: number | null }
  // other managers in two or more of my leagues, most leagues first
  sharedManagers: SharedManager[]
  // players I roster in two or more leagues, most leagues first
  sharedPlayers: SharedPlayer[]
}

function perGame(points: number, games: number) {
  return games > 0 ? points / games : null
}

export function crossLeagueStats(leagues: LeagueData[]): CrossLeagueStats {
  const records: LeagueRecord[] = []
  const total = { wins: 0, losses: 0, ties: 0, games: 0, points: 0 }
  for (const { league, season } of leagues) {
    if (!season) continue
    const games = season.wins + season.losses + season.ties
    records.push({ league, record: season, games, pointsPerGame: perGame(season.pointsFor, games) })
    total.wins += season.wins
    total.losses += season.losses
    total.ties += season.ties
    total.games += games
    total.points += season.pointsFor
  }

  // Same grouping idea as combinePlayers: one entry per person, collecting their leagues
  const managers = new Map<string, SharedManager>()
  for (const { league, members } of leagues) {
    for (const member of members) {
      if (member.isMe) continue
      let manager = managers.get(member.id)
      if (!manager) {
        manager = { id: member.id, name: member.realName ?? member.displayName, leagues: [] }
        managers.set(member.id, manager)
      }
      manager.leagues.push({ leagueName: league.name, teamName: member.teamName })
    }
  }

  return {
    records,
    total: {
      wins: total.wins,
      losses: total.losses,
      ties: total.ties,
      games: total.games,
      // total points over total games, so a league with more games played counts for more
      pointsPerGame: perGame(total.points, total.games),
    },
    sharedManagers: [...managers.values()]
      .filter((manager) => manager.leagues.length > 1)
      .sort((a, b) => b.leagues.length - a.leagues.length),
    sharedPlayers: combinePlayers(leagues)
      .filter((player) => player.leagues.length > 1)
      .map((player) => ({ playerId: player.playerId, leagueCount: player.leagues.length })),
  }
}
