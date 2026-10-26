// Finds a stat line to start the what-if from: one that wins every matchup the player counts in.

import type { StatLine } from '../platforms/types.ts'
import { applyLine, pointsFor } from './statLine.ts'
import type { StatInput } from './statLine.ts'
import { round2 } from './winScenarios.ts'
import type { LeagueScenario } from './winScenarios.ts'

export type Outcome = 'win' | 'lose' | 'tie'

// What a number of points means in one league. null where it means nothing: he's on a bench.
export function outcomeAt({ role, threshold }: LeagueScenario, points: number): Outcome | null {
  if (threshold === null) return null
  if (points === threshold) return 'tie'
  const win = role === 'myStarter' ? points > threshold : points < threshold
  return win ? 'win' : 'lose'
}

// His points in one league if he finished with this line
export function pointsWithLine(
  scenario: LeagueScenario,
  line: StatLine,
  actual: StatLine,
  position: string | null,
) {
  return round2(pointsFor(applyLine(actual, line, position), scenario.league.scoring ?? {}))
}

// The matchups a line can decide: he starts for one side, and the league's rules are known
function decidable(scenarios: LeagueScenario[]) {
  return scenarios.filter((scenario) => scenario.threshold !== null && scenario.league.scoring)
}

// A typical good game at each position. Scaling it up and down gives a family of believable
// lines to try, from nothing at all to several times this.
const TYPICAL_GAME: Record<string, StatLine> = {
  QB: { pass_yd: 250, pass_td: 1.7, rush_yd: 15 },
  RB: { rush_yd: 80, rush_td: 0.7, rec: 3, rec_yd: 20 },
  WR: { rec: 6, rec_yd: 80, rec_td: 0.6 },
  TE: { rec: 5, rec_yd: 55, rec_td: 0.5 },
}
const LARGEST_SCALE = 4
const SCALE_STEP = 0.05

function zeros(inputs: StatInput[]): StatLine {
  return Object.fromEntries(inputs.map((input) => [input.key, 0]))
}

// The smallest scaled-up typical game that wins every decidable matchup, or null if none does.
// Where I start him he must score enough; where I face him he must not score too much. When
// both apply there may be a window between them, or no line at all.
export function findWinningLine(
  scenarios: LeagueScenario[],
  actual: StatLine,
  position: string | null,
  inputs: StatInput[],
): StatLine | null {
  const matchups = decidable(scenarios)
  const shape = position ? TYPICAL_GAME[position] : undefined
  if (matchups.length === 0 || !shape) return null

  for (let scale = 0; scale <= LARGEST_SCALE + 1e-9; scale += SCALE_STEP) {
    const line = zeros(inputs)
    // Whole numbers only: nobody finishes with 4.2 catches
    for (const [stat, amount] of Object.entries(shape)) line[stat] = Math.round(amount * scale)
    const winsAll = matchups.every(
      (scenario) => outcomeAt(scenario, pointsWithLine(scenario, line, actual, position)) === 'win',
    )
    if (winsAll) return line
  }
  return null
}

export interface StartingLine {
  line: StatLine
  // 'winning': wins every matchup he counts in. 'none': no such line was found, so all zeros.
  // 'real': there is nothing to win or lose, so his real line.
  kind: 'winning' | 'none' | 'real'
}

export function startingLine(
  scenarios: LeagueScenario[],
  actual: StatLine,
  position: string | null,
  inputs: StatInput[],
): StartingLine {
  if (decidable(scenarios).length === 0) {
    const real = Object.fromEntries(inputs.map((input) => [input.key, actual[input.key] ?? 0]))
    return { line: real, kind: 'real' }
  }
  const winning = findWinningLine(scenarios, actual, position, inputs)
  return winning ? { line: winning, kind: 'winning' } : { line: zeros(inputs), kind: 'none' }
}
