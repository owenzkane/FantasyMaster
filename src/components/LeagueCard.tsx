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

// A team name is what people go by in a league; the display name is only a fallback, since on
// ESPN it's often an auto-generated handle
function opponentLabel(opponent: Opponent) {
  return opponent.teamName ?? opponent.displayName ?? 'Unknown opponent'
}

interface Result {
  text: string
  tone: 'good' | 'bad' | 'neutral'
}

// Past weeks are over, so they're judged on real points. The current week and future weeks are
// judged on projections: who is expected to win, not who is ahead right now.
function resultOf(matchup: Matchup, timing: WeekTiming): Result | null {
  const { opponent } = matchup
  if (!opponent) return null

  if (timing !== 'past' && matchup.myProjected !== null && opponent.projected !== null) {
    const difference = matchup.myProjected - opponent.projected
    if (difference === 0) return { text: 'Projected tie', tone: 'neutral' }
    return difference > 0
      ? { text: 'Projected win', tone: 'good' }
      : { text: 'Projected loss', tone: 'bad' }
  }

  // No projections to go on. A future week has no points either, so it gets no result; the
  // current week falls back to who is ahead right now.
  if (timing === 'future') return null
  const difference = matchup.myPoints - opponent.points
  if (difference === 0) return { text: 'Tied', tone: 'neutral' }
  if (timing === 'past') {
    return difference > 0 ? { text: 'Won', tone: 'good' } : { text: 'Lost', tone: 'bad' }
  }
  return difference > 0 ? { text: 'Winning', tone: 'good' } : { text: 'Losing', tone: 'bad' }
}

function Projected({ points }: { points: number | null }) {
  if (points === null) return null
  return <span className="projected">proj {points.toFixed(2)}</span>
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
  const result = resultOf(matchup, timing)

  return (
    <li className="league-card">
      {/* <details> is the browser's built-in expand/collapse; <summary> is the part always shown */}
      <details>
        <summary className="league-card-row">
          <div>
            <h3>{league.name}</h3>
            <p className="league-meta">
              {PLATFORM_NAMES[league.platform]} · {league.teamCount} teams
            </p>
            <p className="league-meta">
              {matchup.myTeamName ?? 'You'} {opponent ? `vs. ${opponentLabel(opponent)}` : '(no opponent)'}
            </p>
          </div>
          <div className="league-card-result">
            {result && <p className={`result result-${result.tone}`}>{result.text}</p>}
            <dl className="scores">
              <div>
                <dt>You</dt>
                <dd>
                  {matchup.myPoints.toFixed(2)}
                  <Projected points={matchup.myProjected} />
                </dd>
              </div>
              <div>
                <dt>Opponent</dt>
                <dd>
                  {opponent ? opponent.points.toFixed(2) : '—'}
                  <Projected points={opponent?.projected ?? null} />
                </dd>
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
