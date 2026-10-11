// Converts a stat line (catches, yards, touchdowns...) into fantasy points under a league's
// scoring rules. A stat line is the same in every league; the points it is worth are not.

import { pointsFor } from '../platforms/scoring.ts'
import type { StatLine } from '../platforms/types.ts'

// The conversion itself lives with the platforms, which also use it for projections
export { pointsFor }

export interface StatInput {
  key: string
  label: string
  // the largest value worth trying when solving for this stat; undefined if it can't be solved for
  solveMax?: number
}

const PASSING: StatInput[] = [
  { key: 'pass_yd', label: 'Pass yards', solveMax: 700 },
  { key: 'pass_td', label: 'Pass TDs', solveMax: 10 },
  { key: 'pass_int', label: 'Interceptions' },
]
const RUSHING: StatInput[] = [
  { key: 'rush_yd', label: 'Rush yards', solveMax: 400 },
  { key: 'rush_td', label: 'Rush TDs', solveMax: 8 },
]
const RECEIVING: StatInput[] = [
  { key: 'rec', label: 'Catches', solveMax: 30 },
  { key: 'rec_yd', label: 'Rec yards', solveMax: 400 },
  { key: 'rec_td', label: 'Rec TDs', solveMax: 8 },
]
const FUMBLES: StatInput[] = [{ key: 'fum_lost', label: 'Fumbles lost' }]

// The stats you can type in for a position, most important first.
// null for kickers, defenses and anyone else: they score on different stats.
export function statInputs(position: string | null): StatInput[] | null {
  if (position === 'QB') return [...PASSING, ...RUSHING, ...FUMBLES]
  if (position === 'RB') return [...RUSHING, ...RECEIVING, ...FUMBLES]
  if (position === 'WR' || position === 'TE') return [...RECEIVING, ...RUSHING, ...FUMBLES]
  return null
}

// Bonuses that follow directly from yardage totals. Sleeper only sets the highest tier reached:
// a 213-yard game has the 200 bonus but not the 100 one. `below` is where the next tier starts.
const YARDAGE_BONUSES: { key: string; from: string[]; mark: number; below?: number }[] = [
  { key: 'bonus_pass_yd_300', from: ['pass_yd'], mark: 300, below: 400 },
  { key: 'bonus_pass_yd_400', from: ['pass_yd'], mark: 400 },
  { key: 'bonus_rush_yd_100', from: ['rush_yd'], mark: 100, below: 200 },
  { key: 'bonus_rush_yd_200', from: ['rush_yd'], mark: 200 },
  { key: 'bonus_rec_yd_100', from: ['rec_yd'], mark: 100, below: 200 },
  { key: 'bonus_rec_yd_200', from: ['rec_yd'], mark: 200 },
  { key: 'bonus_rush_rec_yd_100', from: ['rush_yd', 'rec_yd'], mark: 100, below: 200 },
  { key: 'bonus_rush_rec_yd_200', from: ['rush_yd', 'rec_yd'], mark: 200 },
]

// Extra points per catch for one position (e.g. "TE premium"); the stat equals his catches
const RECEPTION_BONUSES: Record<string, string> = {
  RB: 'bonus_rec_rb',
  WR: 'bonus_rec_wr',
  TE: 'bonus_rec_te',
}

// His real stats with the typed-in line laid over the top, and the bonuses above recalculated.
// Anything a basic line can't express (first downs, 40+ yard plays, completions) keeps its real value.
export function applyLine(actual: StatLine, line: StatLine, position: string | null): StatLine {
  const stats: StatLine = { ...actual, ...line }
  for (const { key, from, mark, below } of YARDAGE_BONUSES) {
    const yards = from.reduce((sum, stat) => sum + (stats[stat] ?? 0), 0)
    stats[key] = yards >= mark && (below === undefined || yards < below) ? 1 : 0
  }
  const receptionBonus = position ? RECEPTION_BONUSES[position] : undefined
  if (receptionBonus) stats[receptionBonus] = stats.rec ?? 0
  return stats
}

// Points coming from his real stats that the typed-in line doesn't control
export function keptPoints(
  actual: StatLine,
  inputs: StatInput[],
  position: string | null,
  scoring: Record<string, number>,
) {
  const controlled = new Set([
    ...inputs.map((input) => input.key),
    ...YARDAGE_BONUSES.map((bonus) => bonus.key),
    ...(position && RECEPTION_BONUSES[position] ? [RECEPTION_BONUSES[position]] : []),
  ])
  const kept: StatLine = {}
  for (const [stat, amount] of Object.entries(actual)) {
    if (!controlled.has(stat)) kept[stat] = amount
  }
  return pointsFor(kept, scoring)
}
