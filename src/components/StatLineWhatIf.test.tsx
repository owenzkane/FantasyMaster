import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { League } from '../platforms/types.ts'
import { statInputs } from '../scenarios/statLine.ts'
import type { LeagueScenario, ScenarioRole } from '../scenarios/winScenarios.ts'
import { startingLine } from '../scenarios/winningLine.ts'
import type { StartingLine } from '../scenarios/winningLine.ts'
import StatLineWhatIf from './StatLineWhatIf.tsx'

// A receiver with 5 catches for 50 yards scores 10 in every league here (1 per catch, 0.1 per yard)
const scenario = (name: string, role: ScenarioRole, threshold: number | null): LeagueScenario => ({
  league: {
    id: name,
    platform: 'sleeper',
    name,
    season: '2026',
    teamCount: 10,
    myTeamId: 'me',
    pointsPerReception: 1,
    scoring: { rec: 1, rec_yd: 0.1 },
    scoringGaps: 0,
  } satisfies League,
  role,
  currentPoints: 10,
  threshold,
  standing: 'winning',
})

const REAL_LINE = { rec: 5, rec_yd: 50 }

function render(scenarios: LeagueScenario[], settled = false, start?: StartingLine) {
  return renderToStaticMarkup(
    <StatLineWhatIf
      scenarios={scenarios}
      position="WR"
      inputs={statInputs('WR')!}
      actual={REAL_LINE}
      settled={settled}
      start={start ?? { line: REAL_LINE, kind: 'real' }}
    />,
  )
}

function summary(scenarios: LeagueScenario[], settled = false) {
  const html = render(scenarios, settled)
  const text = (part: string) =>
    part
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  return {
    headline: text(html.match(/<p class="what-if-summary">.*?<\/p>/s)![0]),
    sides: [...html.matchAll(/<li>.*?<\/li>/gs)].map((item) => text(item[0])),
    table: text(html.split('<tbody>')[1]),
  }
}

describe('StatLineWhatIf summary', () => {
  // With 10 points: starting him needs more than the threshold, facing him needs fewer
  const mixed = [
    scenario('Alpha', 'myStarter', 8), // 10 > 8: win
    scenario('Bravo', 'myStarter', 12), // 10 < 12: lose
    scenario('Charlie', 'opponentStarter', 15), // 10 < 15: win
    scenario('Delta', 'opponentStarter', 9), // 10 > 9: lose
    scenario('Echo', 'myBench', null),
  ]

  it('still gives the overall count', () => {
    expect(summary(mixed).headline).toBe('With this line you win 2 of the 4 matchups he counts in.')
  })

  it('separates the leagues where I start him from the ones where I face him', () => {
    expect(summary(mixed).sides).toEqual([
      'You start him in 2 leagues: win in Alpha; lose in Bravo',
      'You face him in 2 leagues: win in Charlie; lose in Delta',
      'Benched, so he doesn’t count: Echo',
    ])
  })

  it('leaves out a side he isn’t on, and the bench line when he isn’t benched anywhere', () => {
    expect(summary([scenario('Alpha', 'myStarter', 8)]).sides).toEqual([
      'You start him in 1 league: win in Alpha',
    ])
  })

  it('groups several leagues with the same result, and reports ties', () => {
    const scenarios = [
      scenario('Alpha', 'opponentStarter', 15),
      scenario('Bravo', 'opponentStarter', 20),
      scenario('Charlie', 'opponentStarter', 10), // exactly the threshold
    ]
    expect(summary(scenarios).sides).toEqual([
      'You face him in 3 leagues: win in Alpha, Bravo; tie in Charlie',
    ])
  })

  it('uses the past tense once his week is over', () => {
    const settled = summary(mixed, true)
    expect(settled.headline).toBe(
      'With this line you would have won 2 of the 4 matchups he counts in.',
    )
    expect(settled.sides[0]).toBe('You start him in 2 leagues: won in Alpha; lost in Bravo')
  })

  it('labels each row of the table with which side he’s on', () => {
    const { table } = summary(mixed)
    expect(table).toContain('Alpha PPR · you start him')
    expect(table).toContain('Charlie PPR · you face him')
    expect(table).toContain('Echo PPR · on your bench')
  })
})

describe('StatLineWhatIf starting line', () => {
  const inputs = statInputs('WR')!
  const boxes = (html: string) =>
    Object.fromEntries(
      [...html.matchAll(/<label>([^<]*)<input[^>]*value="([^"]*)"/g)].map((m) => [m[1], m[2]]),
    )

  it('fills the boxes with a line that wins every matchup, and says so', () => {
    const scenarios = [scenario('Alpha', 'myStarter', 12), scenario('Bravo', 'opponentStarter', 30)]
    const start = startingLine(scenarios, REAL_LINE, 'WR', inputs)
    const html = render(scenarios, false, start)
    expect(start.kind).toBe('winning')
    expect(boxes(html)).toMatchObject({
      Catches: String(start.line.rec),
      'Rec yards': String(start.line.rec_yd),
    })
    expect(html).toContain('Filled in with a line that wins every matchup he counts in')
    expect(html).toContain('With this line you win 2 of the 2 matchups he counts in.')
  })

  it('fills every box with 0 when no line wins them all, and says so', () => {
    const scenarios = [scenario('Alpha', 'myStarter', 30), scenario('Bravo', 'opponentStarter', 5)]
    const html = render(scenarios, false, startingLine(scenarios, REAL_LINE, 'WR', inputs))
    expect(Object.values(boxes(html)).every((value) => value === '0')).toBe(true)
    expect(html).toContain('No single line wins every matchup he counts in, so it starts at zero.')
  })

  it('offers his real line when he has one', () => {
    expect(render([scenario('Alpha', 'myStarter', 8)])).toContain('Use his real line')
  })
})
