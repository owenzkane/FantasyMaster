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
  // a tie counts as half a win; null before any game has been played
  winPct: number | null
  // null before any game has been played
  pointsPerGame: number | null
}

export interface Totals {
  wins: number
  losses: number
  ties: number
  games: number
  winPct: number | null
  pointsPerGame: number | null
  // what my leagues average per game, each league counted by the games I've played in it,
  // so it's directly comparable with my own pointsPerGame
  leaguePointsPerGame: number | null
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
  total: Totals
  // other managers in two or more of my leagues, most leagues first
  sharedManagers: SharedManager[]
  // players I roster in two or more leagues, most leagues first
  sharedPlayers: SharedPlayer[]
}

function perGame(points: number, games: number) {
  return games > 0 ? points / games : null
}

function winPct(record: { wins: number; ties: number }, games: number) {
  return games > 0 ? (record.wins + record.ties / 2) / games : null
}

export function crossLeagueStats(leagues: LeagueData[]): CrossLeagueStats {
  const records: LeagueRecord[] = []
  const total = { wins: 0, losses: 0, ties: 0, games: 0, points: 0, leaguePoints: 0 }
  for (const { league, season } of leagues) {
    if (!season) continue
    const games = season.wins + season.losses + season.ties
    records.push({
      league,
      record: season,
      games,
      winPct: winPct(season, games),
      pointsPerGame: perGame(season.pointsFor, games),
    })
    total.leaguePoints += (season.leaguePointsPerGame ?? 0) * games
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
      winPct: winPct(total, total.games),
      // total points over total games, so a league with more games played counts for more
      pointsPerGame: perGame(total.points, total.games),
      leaguePointsPerGame: perGame(total.leaguePoints, total.games),
    },
    sharedManagers: [...managers.values()]
      .filter((manager) => manager.leagues.length > 1)
      .sort((a, b) => b.leagues.length - a.leagues.length),
    // combinePlayers orders by who I'm starting; this list is about who I hold the most
    sharedPlayers: combinePlayers(leagues)
      .filter((player) => player.leagues.length > 1)
      .map((player) => ({ playerId: player.playerId, leagueCount: player.leagues.length }))
      .sort((a, b) => b.leagueCount - a.leagueCount),
  }
}
