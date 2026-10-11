// Turns "each league's list of my players" into "each player's list of leagues".

import type { League, PlayerPoints } from '../platforms/types.ts'

export interface PlayerLeagueEntry {
  leagueId: string
  leagueName: string
  // in that league's scoring; null when there are no scores for the week
  points: number | null
  // what he was expected to score in that league; null when there's no projection
  projected: number | null
}

export interface MyPlayer {
  playerId: string
  // one entry per league I roster this player in
  leagues: PlayerLeagueEntry[]
}

interface LeaguePlayers {
  league: League
  myPlayers: PlayerPoints[]
}

function totalPoints(player: MyPlayer) {
  return player.leagues.reduce((sum, entry) => sum + (entry.points ?? 0), 0)
}

export function combinePlayers(leagues: LeaguePlayers[]): MyPlayer[] {
  const byId = new Map<string, MyPlayer>()

  for (const { league, myPlayers } of leagues) {
    for (const { playerId, points, projected } of myPlayers) {
      let player = byId.get(playerId)
      if (!player) {
        player = { playerId, leagues: [] }
        byId.set(playerId, player)
      }
      player.leagues.push({ leagueId: league.id, leagueName: league.name, points, projected })
    }
  }

  // Most-rostered first, then by points
  return [...byId.values()].sort(
    (a, b) => b.leagues.length - a.leagues.length || totalPoints(b) - totalPoints(a),
  )
}
