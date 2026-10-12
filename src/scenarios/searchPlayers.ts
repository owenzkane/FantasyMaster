// Finds players by name for the win-scenarios search box.

import type { PlayerDirectory } from '../platforms/types.ts'
import type { ScenarioPlayer } from './winScenarios.ts'

// "A.J. Brown" and "aj brown" should compare equal: lower case, punctuation dropped
function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Players whose name contains every word typed, in the order they were given (most leagues
// first). An empty search matches nobody, so the list only appears once something is typed.
export function searchPlayers(
  query: string,
  players: ScenarioPlayer[],
  directory: PlayerDirectory,
  limit = 8,
): ScenarioPlayer[] {
  const words = normalize(query).split(' ').filter(Boolean)
  if (words.length === 0) return []

  const matches: ScenarioPlayer[] = []
  for (const player of players) {
    const name = normalize(directory[player.playerId]?.name ?? '')
    if (words.every((word) => name.includes(word))) {
      matches.push(player)
      if (matches.length === limit) break
    }
  }
  return matches
}
