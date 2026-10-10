// Translates ESPN's numbered scoring rules into our stat names (which are Sleeper's), so the
// stat-line what-if can score a line under an ESPN league's rules.

import type { EspnScoringItem } from './espnTypes.ts'

// ESPN stat number -> our stat name. Each pair was checked by comparing ESPN's and Sleeper's
// stats for the same players over weeks 1 to 4 of 2026: every value that showed up agreed.
// The three marked "unseen" never occurred in that data and are included by analogy.
const STAT_NAMES: Record<number, string> = {
  0: 'pass_att',
  1: 'pass_cmp',
  2: 'pass_inc',
  3: 'pass_yd',
  4: 'pass_td',
  15: 'pass_td_40p',
  16: 'pass_td_50p',
  17: 'bonus_pass_yd_300',
  18: 'bonus_pass_yd_400',
  19: 'pass_2pt',
  20: 'pass_int',
  23: 'rush_att',
  24: 'rush_yd',
  25: 'rush_td',
  26: 'rush_2pt',
  35: 'rush_td_40p',
  36: 'rush_td_50p',
  37: 'bonus_rush_yd_100',
  38: 'bonus_rush_yd_200', // unseen
  42: 'rec_yd',
  43: 'rec_td',
  44: 'rec_2pt',
  45: 'rec_td_40p',
  46: 'rec_td_50p',
  53: 'rec',
  56: 'bonus_rec_yd_100',
  57: 'bonus_rec_yd_200', // unseen
  58: 'rec_tgt',
  63: 'fum_rec_td', // unseen
  68: 'fum',
  72: 'fum_lost',
}

// ESPN numbers passing, rushing, receiving and fumble stats below 74. From 74 up they are
// kicking, defense and special teams, which the what-if doesn't cover.
const FIRST_NON_OFFENSE_STAT = 74

export function toScoring(items: EspnScoringItem[]) {
  const scoring: Record<string, number> = {}
  // offensive rules that score points but have no translation; the what-if can't account for them
  let gaps = 0
  for (const { statId, points } of items) {
    const name = STAT_NAMES[statId]
    if (name) scoring[name] = points
    else if (statId < FIRST_NON_OFFENSE_STAT && points !== 0) gaps++
  }
  return { scoring, gaps }
}
