// "Projected right now": what a player or team is expected to finish with, given which games
// have already been played. A finished game counts for what really happened, a game that
// hasn't started for its projection, and a game under way for what's scored so far plus the
// projection scaled to the share of the game still to play.

import type { LiveGames, PlayerDirectory, PlayerPoints } from './types.ts'
import { round2 } from './scoring.ts'

export function projectedNow(
  player: PlayerPoints,
  team: string | null,
  games: LiveGames,
): number | null {
  const game = team ? games[team] : undefined
  // No game: not started, on a bye, or the scoreboard was unavailable
  if (!game || game.state === 'pre') return player.projected

  const scored = player.points ?? 0
  if (game.state === 'post' || player.projected === null) return scored
  return scored + player.projected * game.fractionRemaining
}

// A team's total: its starters, each projected as above. null when nobody has a number, so
// "no projections" isn't shown as a projected 0.
export function liveProjectedTotal(
  players: PlayerPoints[],
  directory: PlayerDirectory,
  games: LiveGames,
) {
  const values = players
    .filter((player) => player.isStarter)
    .map((player) => projectedNow(player, directory[player.playerId]?.team ?? null, games))
    .filter((value) => value !== null)
  if (values.length === 0) return null
  return round2(values.reduce((sum, value) => sum + value, 0))
}
