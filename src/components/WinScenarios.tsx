import { useState } from 'react'
import type { LeagueSummary } from '../hooks/useLeagues.ts'
import type { LiveGames, PlayerDirectory, WeekStats } from '../platforms/types.ts'
import { gameState, isSettled } from '../scenarios/gameStatus.ts'
import type { GameState, WeekTiming } from '../scenarios/gameStatus.ts'
import { searchPlayers } from '../scenarios/searchPlayers.ts'
import { statInputs } from '../scenarios/statLine.ts'
import { startingLine } from '../scenarios/winningLine.ts'
import { scenarioPlayers, scoringFormat, winScenarios } from '../scenarios/winScenarios.ts'
import type { LeagueScenario } from '../scenarios/winScenarios.ts'
import StatLineWhatIf from './StatLineWhatIf.tsx'

interface Props {
  leagues: LeagueSummary[]
  directory: PlayerDirectory
  stats: WeekStats
  week: number
  timing: WeekTiming
  games: LiveGames
}

// What each state means for the person reading: can he still score or not. The badge colour
// repeats the text, never replaces it.
const GAME_LABELS: Record<GameState, { text: string; detail: string; badge: string }> = {
  upcoming: {
    text: 'Yet to play',
    detail: 'He can still score.',
    badge: 'badge-success',
  },
  live: {
    text: 'Playing now',
    detail: 'His score can still change.',
    badge: 'badge-warning',
  },
  final: { text: 'Has played', detail: 'His score is final.', badge: '' },
  bye: { text: 'On a bye', detail: 'He has no game this week.', badge: '' },
  didNotPlay: {
    text: 'Did not play',
    detail: 'He has no stats for this week.',
    badge: '',
  },
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

function WinScenarios({ leagues, directory, stats, week, timing, games }: Props) {
  const [chosenId, setChosenId] = useState('')
  const [query, setQuery] = useState('')

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
  const info = directory[playerId]
  const position = info?.position ?? null
  const inputs = statInputs(position)

  const state = gameState(playerId, { timing, games, directory, stats })
  const settled = isSettled(state)

  const matches = searchPlayers(query, options, directory)
  const leaguesText = (count: number) => `${count} ${count === 1 ? 'league' : 'leagues'}`
  const choose = (id: string) => {
    setChosenId(id)
    setQuery('')
  }

  return (
    <div className="scenarios">
      <form
        className="player-search"
        role="search"
        onSubmit={(event) => {
          // Pressing Enter picks the top match
          event.preventDefault()
          if (matches.length > 0) choose(matches[0].playerId)
        }}
      >
        <label htmlFor="player-search">Search for a player</label>
        <input
          id="player-search"
          className="input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Any starter in your matchups"
          autoComplete="off"
          spellCheck={false}
        />
        {query.trim() !== '' &&
          (matches.length === 0 ? (
            <p className="scenario-note">No starter in your matchups matches “{query.trim()}”.</p>
          ) : (
            <ul className="search-results">
              {matches.map((match) => (
                <li key={match.playerId}>
                  <button type="button" onClick={() => choose(match.playerId)}>
                    <span>{name(match.playerId)}</span>
                    <span className="player-meta">{leaguesText(match.leagueCount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ))}
      </form>

      <h3 className="scenario-player">
        {name(playerId)}
        {info && (
          <span className="player-meta">
            {[info.position, info.team ?? 'Free agent'].filter(Boolean).join(' · ')}
          </span>
        )}
      </h3>
      {state && (
        <p className="game-state">
          <span className={`badge ${GAME_LABELS[state].badge} game-state-tag`}>
            {GAME_LABELS[state].text}
          </span>{' '}
          {GAME_LABELS[state].detail}
        </p>
      )}

      <div className="players-table-wrap">
        <table className="table players-table">
          <thead>
            <tr>
              <th scope="col">League</th>
              <th scope="col">Role</th>
              <th scope="col" className="number">
                He has
              </th>
              <th scope="col">{settled ? 'He needed' : 'He needs'}</th>
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
        Points are in each league’s own scoring, with every other player held at his current score.
        Landing exactly on a number is a tie.
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
          settled={settled}
          start={startingLine(scenarios, stats[playerId] ?? {}, position, inputs)}
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
