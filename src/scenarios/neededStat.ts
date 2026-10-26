// What I need from one stat, with the rest of the typed line held as it is.

import type { LeagueScenario } from './winScenarios.ts'

// How far past a stat's usual ceiling to keep looking for the point where facing him is lost
const SEARCH_BEYOND = 64

export function neededStat(
  scenario: LeagueScenario,
  // the largest value worth trying for this stat in a realistic game
  max: number,
  // his points in this league if the stat were this value
  pointsAt: (value: number) => number,
) {
  const { role, threshold } = scenario
  if (threshold === null) return 'Doesn’t count'

  if (role === 'myStarter') {
    // Smallest value that puts him over the threshold
    for (let value = 0; value <= max; value++) {
      if (pointsAt(value) > threshold) return value === 0 ? 'Any' : `At least ${value}`
    }
    return 'Out of reach'
  }

  // Opponent's starter: he has to stay under the threshold, so the answer is the first value
  // that is too many
  if (pointsAt(0) >= threshold) return 'You can’t win'
  for (let value = 1; value <= max; value++) {
    if (pointsAt(value) >= threshold) return `Fewer than ${value}`
  }

  // Nothing realistic is too many. Keep going so there's still a number to show: double the
  // value until it's too many, then close in on the exact point by halving the gap.
  let safe = max
  let tooMany = max * 2
  while (pointsAt(tooMany) < threshold) {
    if (tooMany >= max * SEARCH_BEYOND) return 'Any'
    safe = tooMany
    tooMany *= 2
  }
  while (tooMany - safe > 1) {
    const middle = Math.floor((safe + tooMany) / 2)
    if (pointsAt(middle) >= threshold) tooMany = middle
    else safe = middle
  }
  return `Fewer than ${tooMany}`
}
