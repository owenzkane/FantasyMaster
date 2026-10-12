// Whether a player's game this week is still to come, under way or over, so it's clear
// whether his score can still change.

import type { LiveGames, PlayerDirectory, WeekStats } from '../platforms/types.ts'

// Whether the week being shown is before, the same as, or after the real current week
export type WeekTiming = 'past' | 'current' | 'future'

export type GameState = 'upcoming' | 'live' | 'final' | 'bye' | 'didNotPlay'

interface Context {
  timing: WeekTiming
  // this week's games by NFL team; empty when the scoreboard wasn't available
  games: LiveGames
  directory: PlayerDirectory
  stats: WeekStats
}

// null when it can't be told: the scoreboard wasn't available, or his team isn't known
export function gameState(playerId: string, context: Context): GameState | null {
  const { timing, games, directory, stats } = context

  // A week that hasn't started: nobody has played
  if (timing === 'future') return 'upcoming'

  // A finished week: he either has a stat line or he didn't play. If no stats loaded at all,
  // that says nothing about him, so assume he played.
  if (timing === 'past') {
    const statsLoaded = Object.keys(stats).length > 0
    return !statsLoaded || stats[playerId] ? 'final' : 'didNotPlay'
  }

  // The week in progress: go by his team's game
  const team = directory[playerId]?.team
  if (!team || Object.keys(games).length === 0) return null
  const game = games[team]
  if (!game) return 'bye'
  return game.state === 'pre' ? 'upcoming' : game.state === 'in' ? 'live' : 'final'
}

// True when nothing he does can change his score any more
export function isSettled(state: GameState | null) {
  return state === 'final' || state === 'bye' || state === 'didNotPlay'
}
