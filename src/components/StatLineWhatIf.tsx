import { useState } from 'react'
import type { StatLine } from '../platforms/types.ts'
import { applyLine, keptPoints, pointsFor } from '../scenarios/statLine.ts'
import type { StatInput } from '../scenarios/statLine.ts'
import { round2, scoringFormat } from '../scenarios/winScenarios.ts'
import type { LeagueScenario } from '../scenarios/winScenarios.ts'

interface Props {
  // one per league the player is in; bench rows have no threshold
  scenarios: LeagueScenario[]
  position: string | null
  inputs: StatInput[]
  // his real stats this week; empty if he hasn't played or stats couldn't be loaded
  actual: StatLine
}

// What I need from one stat, with the rest of the line as typed
function needed(scenario: LeagueScenario, max: number, pointsAt: (value: number) => number) {
  const { role, threshold } = scenario
  if (threshold === null) return 'Doesn’t count'

  if (role === 'myStarter') {
    // Smallest value that puts him over the threshold
    for (let value = 0; value <= max; value++) {
      if (pointsAt(value) > threshold) return value === 0 ? 'Any' : `At least ${value}`
    }
    return 'Out of reach'
  }

  // Opponent's starter: largest value that keeps him under the threshold
  if (pointsAt(0) >= threshold) return 'You can’t win'
  for (let value = 1; value <= max; value++) {
    if (pointsAt(value) >= threshold) return `At most ${value - 1}`
  }
  return 'Any'
}

function result({ role, threshold, standing }: LeagueScenario, points: number) {
  if (threshold === null) return `Doesn’t count (${standing})`
  if (points === threshold) return 'Tie'
  const win = role === 'myStarter' ? points > threshold : points < threshold
  return win ? 'Win' : 'Lose'
}

function StatLineWhatIf({ scenarios, position, inputs, actual }: Props) {
  // Text, not numbers, so a box can be empty while you type. Starts from his real line.
  const [text, setText] = useState<Record<string, string>>(() =>
    Object.fromEntries(inputs.map((input) => [input.key, String(actual[input.key] ?? 0)])),
  )
  const solvable = inputs.filter((input) => input.solveMax !== undefined)
  const [solveKey, setSolveKey] = useState(
    position === 'QB' ? 'pass_yd' : position === 'RB' ? 'rush_yd' : 'rec_yd',
  )
  const solveInput = solvable.find((input) => input.key === solveKey) ?? solvable[0]

  const line: StatLine = {}
  for (const input of inputs) line[input.key] = Math.max(0, Number(text[input.key]) || 0)

  // Leagues whose rules aren't in our stat names yet (ESPN) can't be converted
  const rows = scenarios.flatMap((scenario) => {
    const scoring = scenario.league.scoring
    if (!scoring) return []
    const pointsWith = (changes: StatLine) =>
      round2(pointsFor(applyLine(actual, { ...line, ...changes }, position), scoring))
    return [
      {
        scenario,
        points: pointsWith({}),
        kept: round2(keptPoints(actual, inputs, position, scoring)),
        needed: needed(scenario, solveInput.solveMax ?? 0, (value) =>
          pointsWith({ [solveInput.key]: value }),
        ),
      },
    ]
  })
  const unsupported = scenarios.filter((scenario) => !scenario.league.scoring)

  const counted = rows.filter((row) => row.scenario.threshold !== null)
  const wins = counted.filter((row) => result(row.scenario, row.points) === 'Win').length

  return (
    <section className="what-if">
      <h3>What if he finishes with…</h3>
      {Object.keys(actual).length === 0 && (
        <p className="scenario-note">No stats for him this week yet, so the line starts at zero.</p>
      )}
      <div className="stat-inputs">
        {inputs.map((input) => (
          <label key={input.key}>
            {input.label}
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={text[input.key]}
              onChange={(event) => setText({ ...text, [input.key]: event.target.value })}
            />
          </label>
        ))}
      </div>

      <p className="what-if-summary">
        With this line you win {wins} of the {counted.length}{' '}
        {counted.length === 1 ? 'matchup' : 'matchups'} he counts in.
      </p>

      <div className="players-table-wrap">
        <table className="players-table">
          <thead>
            <tr>
              <th scope="col">League</th>
              <th scope="col" className="number">
                His points
              </th>
              <th scope="col">Result</th>
              <th scope="col">
                <label className="solve-picker">
                  Needed
                  <select value={solveInput.key} onChange={(event) => setSolveKey(event.target.value)}>
                    {solvable.map((input) => (
                      <option key={input.key} value={input.key}>
                        {input.label}
                      </option>
                    ))}
                  </select>
                </label>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ scenario, points, kept, needed }) => (
              <tr key={scenario.league.id}>
                <th scope="row">
                  {scenario.league.name}
                  <span className="player-meta">{scoringFormat(scenario.league)}</span>
                </th>
                <td className="number">
                  {points.toFixed(2)}
                  {kept !== 0 && <span className="player-meta">incl. {kept.toFixed(2)} kept</span>}
                </td>
                <td>{result(scenario, points)}</td>
                <td>{needed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {unsupported.length > 0 && (
        <p className="scenario-note">
          Not available for ESPN leagues yet:{' '}
          {unsupported.map((scenario) => scenario.league.name).join(', ')}. The table above
          still covers them.
        </p>
      )}
      <p className="scenario-note">
        “Needed” solves for one stat with the rest of the line as typed. “Kept” points come from
        rules a basic line can’t express, such as first downs and long-play bonuses; they stay
        at what he really has this week.
      </p>
    </section>
  )
}

export default StatLineWhatIf
