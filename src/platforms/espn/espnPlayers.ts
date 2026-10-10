// Translates ESPN players into Sleeper player IDs, so a player counts as the same person
// whichever platform a league is on. Sleeper's IDs are the app's common player IDs.

import type { PlayerDirectory } from '../types.ts'
import type { EspnPlayer } from './espnTypes.ts'

const POSITIONS: Record<number, string> = { 1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'DEF' }

// ESPN's NFL team numbers, as the abbreviations Sleeper uses
const PRO_TEAMS: Record<number, string> = {
  1: 'ATL', 2: 'BUF', 3: 'CHI', 4: 'CIN', 5: 'CLE', 6: 'DAL', 7: 'DEN', 8: 'DET',
  9: 'GB', 10: 'TEN', 11: 'IND', 12: 'KC', 13: 'LV', 14: 'LAR', 15: 'MIA', 16: 'MIN',
  17: 'NE', 18: 'NO', 19: 'NYG', 20: 'NYJ', 21: 'PHI', 22: 'ARI', 23: 'PIT', 24: 'LAC',
  25: 'SF', 26: 'SEA', 27: 'TB', 28: 'WAS', 29: 'CAR', 30: 'JAX', 33: 'BAL', 34: 'HOU',
}

// "Marvin Harrison Jr." and "marvin harrison" should compare equal
function normalize(name: string) {
  return name
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g, '')
    .replace(/[^a-z]/g, '')
}

interface PlayerIndex {
  byEspnId: Map<number, string>
  // "normalized name|position" -> every Sleeper ID with that name and position
  byName: Map<string, string[]>
}

// Building the index walks all 12,000 players, so do it once per directory and remember it
const indexes = new WeakMap<PlayerDirectory, PlayerIndex>()

function indexFor(directory: PlayerDirectory): PlayerIndex {
  let index = indexes.get(directory)
  if (!index) {
    index = { byEspnId: new Map(), byName: new Map() }
    for (const [id, player] of Object.entries(directory)) {
      if (player.espnId !== undefined) index.byEspnId.set(player.espnId, id)
      const key = `${normalize(player.name)}|${player.position}`
      const ids = index.byName.get(key)
      if (ids) ids.push(id)
      else index.byName.set(key, [id])
    }
    indexes.set(directory, index)
  }
  return index
}

// Three tries, most reliable first: team defenses by NFL team, then Sleeper's record of the
// ESPN ID, then name and position. Anything left gets an "espn:" ID and shows as unknown.
export function toSleeperPlayerId(player: EspnPlayer, directory: PlayerDirectory): string {
  const team = PRO_TEAMS[player.proTeamId]
  // Sleeper's ID for a team defense is the team abbreviation
  if (player.defaultPositionId === 16 && team && directory[team]) return team

  const index = indexFor(directory)
  const byId = index.byEspnId.get(player.id)
  if (byId) return byId

  const position = POSITIONS[player.defaultPositionId]
  const sameName = index.byName.get(`${normalize(player.fullName)}|${position}`) ?? []
  if (sameName.length === 1) return sameName[0]
  // Two players share a name and position: take the one on the same NFL team, if exactly one is
  const sameTeam = sameName.filter((id) => directory[id].team === team)
  if (sameTeam.length === 1) return sameTeam[0]

  return `espn:${player.id}`
}
