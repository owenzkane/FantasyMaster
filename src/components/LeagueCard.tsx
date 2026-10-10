import type { LeagueSummary } from '../hooks/useLeagues.ts'
import type { Matchup, Opponent, PlayerDirectory } from '../platforms/types.ts'
import Lineup from './Lineup.tsx'

// Whether the week being shown is before, the same as, or after the real current week
export type WeekTiming = 'past' | 'current' | 'future'

interface Props {
  summary: LeagueSummary
  timing: WeekTiming
  directory: PlayerDirectory
}

const PLATFORM_NAMES = { sleeper: 'Sleeper', espn: 'ESPN' }

function opponentLabel(opponent: Opponent) {
  const name = opponent.displayName ?? 'Unknown opponent'
  return opponent.teamName ? `${opponent.teamName} (${name})` : name
}

// Future weeks are all 0-0, so they get no result
function resultWord(matchup: Matchup, timing: WeekTiming) {
  if (!matchup.opponent || timing === 'future') return null
  const difference = matchup.myPoints - matchup.opponent.points
  if (difference === 0) return 'Tied'
  if (timing === 'past') return difference > 0 ? 'Won' : 'Lost'
  return difference > 0 ? 'Winning' : 'Losing'
}

function LeagueCard({ summary, timing, directory }: Props) {
  const { league, matchup, myPlayers, opponentPlayers } = summary

  if (matchup === null) {
    return (
      <li className="league-card">
        <div className="league-card-row">
          <div>
            <h3>{league.name}</h3>
            <p className="league-meta">
              {PLATFORM_NAMES[league.platform]} · {league.teamCount} teams
            </p>
          </div>
          <p className="no-matchup">No matchup this week</p>
        </div>
      </li>
    )
  }

  const { opponent } = matchup
  const result = resultWord(matchup, timing)

  return (
    <li className="league-card">
      {/* <details> is the browser's built-in expand/collapse; <summary> is the part always shown */}
      <details>
        <summary className="league-card-row">
          <div>
            <h3>{league.name}</h3>
            <p className="league-meta">
              {PLATFORM_NAMES[league.platform]} · {league.teamCount} teams ·{' '}
              {opponent ? `vs. ${opponentLabel(opponent)}` : 'No opponent'}
            </p>
          </div>
          <div className="league-card-result">
            {result && <p className={`result result-${result.toLowerCase()}`}>{result}</p>}
            <dl className="scores">
              <div>
                <dt>You</dt>
                <dd>{matchup.myPoints.toFixed(2)}</dd>
              </div>
              <div>
                <dt>Opponent</dt>
                <dd>{opponent ? opponent.points.toFixed(2) : '—'}</dd>
              </div>
            </dl>
          </div>
        </summary>
        <div className="lineups">
          <Lineup
            title="Your starters"
            players={myPlayers.filter((player) => player.isStarter)}
            directory={directory}
          />
          {opponent && (
            <Lineup
              title="Opponent's starters"
              players={opponentPlayers.filter((player) => player.isStarter)}
              directory={directory}
            />
          )}
        </div>
      </details>
    </li>
  )
}

export default LeagueCard
