import { beforeAll, describe, expect, it } from 'vitest'
import type { League } from '../platforms/types.ts'
import { loadDemo } from '../testing/demo.ts'
import { statInputs } from './statLine.ts'
import { findWinningLine, outcomeAt, pointsWithLine, startingLine } from './winningLine.ts'
import { winScenarios } from './winScenarios.ts'
import type { LeagueScenario, ScenarioRole } from './winScenarios.ts'

// One point per catch, a tenth per yard, six per touchdown
const scoring = { rec: 1, rec_yd: 0.1, rec_td: 6 }
const scenario = (
  name: string,
  role: ScenarioRole,
  threshold: number | null,
  rules: Record<string, number> | null = scoring,
): LeagueScenario => ({
  league: { id: name, name, scoring: rules } as League,
  role,
  currentPoints: 0,
  threshold,
  standing: 'losing',
})
const inputs = statInputs('WR')!
const find = (scenarios: LeagueScenario[]) => findWinningLine(scenarios, {}, 'WR', inputs)
const pointsIn = (s: LeagueScenario, line: Record<string, number>) => pointsWithLine(s, line, {}, 'WR')

describe('outcomeAt', () => {
  it('needs more than the threshold where I start him and fewer where I face him', () => {
    expect(outcomeAt(scenario('A', 'myStarter', 10), 10.1)).toBe('win')
    expect(outcomeAt(scenario('A', 'myStarter', 10), 9.9)).toBe('lose')
    expect(outcomeAt(scenario('A', 'opponentStarter', 10), 9.9)).toBe('win')
    expect(outcomeAt(scenario('A', 'opponentStarter', 10), 10.1)).toBe('lose')
  })

  it('is a tie exactly on the threshold, and nothing for a bench player', () => {
    expect(outcomeAt(scenario('A', 'myStarter', 10), 10)).toBe('tie')
    expect(outcomeAt(scenario('A', 'myBench', null), 50)).toBeNull()
  })
})

describe('findWinningLine', () => {
  it('finds a line that clears the bar in every league where I start him', () => {
    const leagues = [scenario('A', 'myStarter', 12), scenario('B', 'myStarter', 20)]
    const line = find(leagues)!
    expect(pointsIn(leagues[0], line)).toBeGreaterThan(12)
    expect(pointsIn(leagues[1], line)).toBeGreaterThan(20)
  })

  it('finds the smallest such line, not just any big one', () => {
    const [league] = [scenario('A', 'myStarter', 12)]
    const line = find([league])!
    // comfortably under double what was needed
    expect(pointsIn(league, line)).toBeLessThan(24)
  })

  it('uses whole numbers and leaves the stats it doesn’t need at zero', () => {
    const line = find([scenario('A', 'myStarter', 12)])!
    expect(Object.values(line).every(Number.isInteger)).toBe(true)
    expect(line).toMatchObject({ rush_yd: 0, rush_td: 0, fum_lost: 0 })
    expect(Object.keys(line).sort()).toEqual(inputs.map((input) => input.key).sort())
  })

  it('is all zeros when I only face him: nothing is the best he can do for me', () => {
    const line = find([scenario('A', 'opponentStarter', 15)])!
    expect(Object.values(line).every((value) => value === 0)).toBe(true)
  })

  it('finds a line in the window when I need him to score some but not too much', () => {
    const start = scenario('A', 'myStarter', 10)
    const face = scenario('B', 'opponentStarter', 20)
    const line = find([start, face])!
    expect(pointsIn(start, line)).toBeGreaterThan(10)
    expect(pointsIn(face, line)).toBeLessThan(20)
  })

  it('uses each league’s own scoring to find that window', () => {
    // I start him where catches are worth nothing and face him where they're worth one
    const start = scenario('A', 'myStarter', 5, { rec_yd: 0.1, rec_td: 6 })
    const face = scenario('B', 'opponentStarter', 11)
    const line = find([start, face])!
    expect(pointsIn(start, line)).toBeGreaterThan(5)
    expect(pointsIn(face, line)).toBeLessThan(11)
  })

  it('gives null when no line can do both', () => {
    expect(find([scenario('A', 'myStarter', 30), scenario('B', 'opponentStarter', 5)])).toBeNull()
  })

  it('gives null when the bar is out of reach', () => {
    expect(find([scenario('A', 'myStarter', 500)])).toBeNull()
  })

  it('gives null when I can’t win a league whatever he does', () => {
    expect(find([scenario('A', 'opponentStarter', -3)])).toBeNull()
  })

  it('ignores leagues where he’s benched, and leagues whose rules aren’t known', () => {
    const line = find([
      scenario('A', 'myStarter', 12),
      scenario('B', 'myBench', null),
      scenario('C', 'myStarter', 400, null),
    ])
    expect(line).not.toBeNull()
  })

  it('gives null when there’s nothing to decide, or for a position with no typical game', () => {
    expect(find([scenario('A', 'myBench', null)])).toBeNull()
    expect(findWinningLine([scenario('A', 'myStarter', 5)], {}, 'K', inputs)).toBeNull()
  })

  it('counts points his real game earned that a typed line can’t change', () => {
    const league = scenario('A', 'myStarter', 12, { ...scoring, rec_fd: 1 })
    // four first downs already in the books are worth 4 before anything is typed
    const withKept = findWinningLine([league], { rec_fd: 4 }, 'WR', inputs)!
    const without = find([league])!
    expect(withKept.rec_yd).toBeLessThan(without.rec_yd)
  })
})

describe('startingLine', () => {
  it('starts on a winning line when there is one', () => {
    const start = startingLine([scenario('A', 'myStarter', 12)], {}, 'WR', inputs)
    expect(start.kind).toBe('winning')
  })

  it('starts on all zeros when there isn’t', () => {
    const start = startingLine(
      [scenario('A', 'myStarter', 30), scenario('B', 'opponentStarter', 5)],
      { rec: 4 },
      'WR',
      inputs,
    )
    expect(start.kind).toBe('none')
    expect(Object.values(start.line).every((value) => value === 0)).toBe(true)
  })

  it('starts on his real line when he’s benched everywhere, so there’s nothing to win', () => {
    const start = startingLine([scenario('A', 'myBench', null)], { rec: 4, rec_yd: 61 }, 'WR', inputs)
    expect(start).toMatchObject({ kind: 'real', line: { rec: 4, rec_yd: 61, rec_td: 0 } })
  })
})

describe('winning lines on the fixtures', () => {
  let demo: Awaited<ReturnType<typeof loadDemo>>
  beforeAll(async () => {
    demo = await loadDemo()
  })
  const startFor = (name: string) => {
    const id = demo.playerId(name)
    const position = demo.directory[id].position
    const scenarios = winScenarios(id, demo.all)
    return { scenarios, start: startingLine(scenarios, demo.stats[id], position, statInputs(position)!), id, position }
  }

  it('every line it calls winning really does win every matchup he counts in', () => {
    for (const name of ['Trevor Lawrence', 'Puka Nacua', 'Parker Washington', 'Zay Flowers']) {
      const { scenarios, start, id, position } = startFor(name)
      if (start.kind !== 'winning') continue
      for (const s of scenarios) {
        if (s.threshold === null) continue
        expect(outcomeAt(s, pointsWithLine(s, start.line, demo.stats[id], position))).toBe('win')
      }
    }
  })

  it('finds no line for Brock Bowers, whose opponent in one league can’t be caught', () => {
    // In Demo League 6 I face him and lose even if he scores nothing
    expect(startFor('Brock Bowers').start.kind).toBe('none')
  })
})
