import type { League, Matchup } from '../platforms/types.ts'

interface Props {
  league: League
  matchup: Matchup | null
}

function LeagueCard({ league, matchup }: Props) {
  return (
    <li className="league-card">
      <div>
        <h3>{league.name}</h3>
        <p className="league-meta">{league.teamCount} teams</p>
      </div>
      {matchup === null ? (
        <p className="no-matchup">No matchup this week</p>
      ) : (
        <dl className="scores">
          <div>
            <dt>You</dt>
            <dd>{matchup.myPoints.toFixed(2)}</dd>
          </div>
          <div>
            <dt>Opponent</dt>
            <dd>{matchup.opponentPoints === null ? '—' : matchup.opponentPoints.toFixed(2)}</dd>
          </div>
        </dl>
      )}
    </li>
  )
}

export default LeagueCard
