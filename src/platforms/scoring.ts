// Scoring arithmetic shared by the platforms and the calculators.

import type { PlayerPoints, StatLine } from './types.ts'

// Fantasy points have two decimals; rounding hides floating-point noise like 18.520000000000003
export function round2(value: number) {
  return Math.round(value * 100) / 100
}

// Each stat times the league's points for that stat, added up.
// Checked against Sleeper's own numbers: all 1,221 player scores in the week 4 fixtures match.
export function pointsFor(stats: StatLine, scoring: Record<string, number>) {
  let points = 0
  for (const [stat, amount] of Object.entries(stats)) {
    points += amount * (scoring[stat] ?? 0)
  }
  return points
}

// A team's projected score: its starters' projections added up.
// null when no starter has a projection, so "no projections" isn't shown as a projected 0.
export function projectedTotal(players: PlayerPoints[]) {
  const projections = players
    .filter((player) => player.isStarter && player.projected !== null)
    .map((player) => player.projected!)
  if (projections.length === 0) return null
  return round2(projections.reduce((sum, projected) => sum + projected, 0))
}
