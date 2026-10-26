import type { LeagueSummary } from '../hooks/useLeagues.ts'
import type { PlayerDirectory, SeasonRecord } from '../platforms/types.ts'
import { crossLeagueStats } from '../stats/crossLeagueStats.ts'

interface Props {
  leagues: LeagueSummary[]
  directory: PlayerDirectory
}

// How many rows of the two "most shared" lists to show
const TOP = 5

function recordText({ wins, losses, ties }: Pick<SeasonRecord, 'wins' | 'losses' | 'ties'>) {
  return ties > 0 ? `${wins}–${losses}–${ties}` : `${wins}–${losses}`
}

function pointsText(points: number | null) {
  return points === null ? '—' : points.toFixed(2)
}

function percentText(fraction: number | null) {
  return fraction === null ? '—' : `${(fraction * 100).toFixed(1)}%`
}

// First place shows as a dash, the way standings tables do
function gamesBehindText(record: SeasonRecord) {
  if (record.wins + record.losses + record.ties === 0 || record.gamesBehind === 0) return '—'
  return String(record.gamesBehind)
}

function StatsView({ leagues, directory }: Props) {
  const stats = crossLeagueStats(leagues)
  const platforms = new Set(leagues.map(({ league }) => league.platform))

  return (
    <div className="stats">
      <h3>Season so far</h3>
      <div className="players-table-wrap">
        <table className="table players-table">
          <thead>
            <tr>
              <th scope="col">League</th>
              <th scope="col" className="number">
                Record
              </th>
              <th scope="col" className="number">
                Win %
              </th>
              <th scope="col" className="number">
                Games behind
              </th>
              <th scope="col" className="number">
                Points per game
              </th>
              <th scope="col" className="number">
                League average
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.records.map(({ league, record, winPct, pointsPerGame }) => (
              <tr key={`${league.platform}-${league.id}`}>
                <th scope="row">{league.name}</th>
                <td className="number">{recordText(record)}</td>
                <td className="number">{percentText(winPct)}</td>
                <td className="number">{gamesBehindText(record)}</td>
                <td className="number">{pointsText(pointsPerGame)}</td>
                <td className="number">{pointsText(record.leaguePointsPerGame)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">All leagues</th>
              <td className="number">{recordText(stats.total)}</td>
              <td className="number">{percentText(stats.total.winPct)}</td>
              <td className="number">—</td>
              <td className="number">{pointsText(stats.total.pointsPerGame)}</td>
              <td className="number">{pointsText(stats.total.leaguePointsPerGame)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="scenario-note">
        Records and points are for the season to date and don’t change with the week picker. “Games
        behind” is how far you are from the best record in that league; a dash means first place.
        “League average” is what teams in that league score per game.
      </p>

      <h3>Managers you share the most leagues with</h3>
      {stats.sharedManagers.length === 0 ? (
        <p className="scenario-note">Nobody else is in more than one of your leagues.</p>
      ) : (
        <ol className="stat-list">
          {stats.sharedManagers.slice(0, TOP).map((manager) => (
            <li key={manager.id}>
              <span>
                {manager.name}
                <span className="player-meta">
                  {manager.leagues
                    .map(({ leagueName, teamName }) =>
                      teamName ? `${teamName} in ${leagueName}` : leagueName,
                    )
                    .join(', ')}
                </span>
              </span>
              <span className="number">{manager.leagues.length} leagues</span>
            </li>
          ))}
        </ol>
      )}
      {platforms.size > 1 && (
        <p className="scenario-note">
          Sleeper and ESPN accounts are counted separately: nothing links one person’s accounts on
          the two services.
        </p>
      )}

      <h3>Players you roster most</h3>
      {stats.sharedPlayers.length === 0 ? (
        <p className="scenario-note">You don’t roster any player in more than one league.</p>
      ) : (
        <ol className="stat-list">
          {stats.sharedPlayers.slice(0, TOP).map((player) => {
            const info = directory[player.playerId]
            return (
              <li key={player.playerId}>
                <span>
                  {info ? info.name : `Unknown player (${player.playerId})`}
                  {info && (
                    <span className="player-meta">
                      {[info.position, info.team ?? 'Free agent'].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </span>
                <span className="number">{player.leagueCount} leagues</span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

export default StatsView
