import { useState } from 'react'
import type { LeagueSummary } from '../hooks/useLeagues.ts'
import type { PlayerDirectory, WeekStats } from '../platforms/types.ts'
import { statInputs } from '../scenarios/statLine.ts'
import { scenarioPlayers, scoringFormat, winScenarios } from '../scenarios/winScenarios.ts'
import type { LeagueScenario } from '../scenarios/winScenarios.ts'
import StatLineWhatIf from './StatLineWhatIf.tsx'

interface Props {
  leagues: LeagueSummary[]
  directory: PlayerDirectory
  stats: WeekStats
  week: number
}

const ROLE_LABELS = {
  myStarter: 'You start him',
  opponentStarter: 'Opponent starts him',
  myBench: 'On your bench',
  opponentBench: 'On opponent’s bench',
}

const STANDING_LABELS = { winning: 'Winning', losing: 'Losing', tied: 'Tied' }

function needs({ role, threshold }: LeagueScenario) {
  if (threshold === null) return 'Doesn’t count'
  if (role === 'myStarter') {
    return threshold < 0 ? 'You win whatever he scores' : `More than ${threshold.toFixed(2)}`
  }
  return threshold <= 0 ? 'You can’t win' : `Fewer than ${threshold.toFixed(2)}`
}

function WinScenarios({ leagues, directory, stats, week }: Props) {
  const [chosenId, setChosenId] = useState('')

  const options = scenarioPlayers(leagues)
  if (options.length === 0) {
    return <p className="status">No matchups with starters this week.</p>
  }

  const name = (playerId: string) => directory[playerId]?.name ?? `Unknown player (${playerId})`
  // The chosen player can drop out of the list when the week changes, so fall back to the first
  const playerId = options.some((option) => option.playerId === chosenId)
    ? chosenId
    : options[0].playerId
  const scenarios = winScenarios(playerId, leagues)
  const position = directory[playerId]?.position ?? null
  const inputs = statInputs(position)

  return (
    <div className="scenarios">
      <label className="scenario-picker">
        Player
        <select value={playerId} onChange={(event) => setChosenId(event.target.value)}>
          {options.map((option) => (
            <option key={option.playerId} value={option.playerId}>
              {name(option.playerId)} ({option.leagueCount}{' '}
              {option.leagueCount === 1 ? 'league' : 'leagues'})
            </option>
          ))}
        </select>
      </label>

      <div className="players-table-wrap">
        <table className="players-table">
          <thead>
            <tr>
              <th scope="col">League</th>
              <th scope="col">Role</th>
              <th scope="col" className="number">
                He has
              </th>
              <th scope="col">He needs</th>
              <th scope="col">Right now</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((scenario) => (
              <tr key={scenario.league.id}>
                <th scope="row">
                  {scenario.league.name}
                  <span className="player-meta">{scoringFormat(scenario.league)}</span>
                </th>
                <td>{ROLE_LABELS[scenario.role]}</td>
                <td className="number">{scenario.currentPoints.toFixed(2)}</td>
                <td>{needs(scenario)}</td>
                <td>{STANDING_LABELS[scenario.standing]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="scenario-note">
        Points are in each league’s own scoring, with every other player held at his current
        score. Landing exactly on a number is a tie.
      </p>

      {inputs ? (
        // A new key makes React throw away the old what-if and start a fresh one,
        // so the typed-in line resets when the player or week changes
        <StatLineWhatIf
          key={`${week}-${playerId}`}
          scenarios={scenarios}
          position={position}
          inputs={inputs}
          actual={stats[playerId] ?? {}}
        />
      ) : (
        <p className="scenario-note">
          The stat-line what-if covers quarterbacks, running backs, receivers and tight ends.
        </p>
      )}
    </div>
  )
}

export default WinScenarios
