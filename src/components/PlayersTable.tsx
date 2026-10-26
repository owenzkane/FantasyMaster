import type { InjuryStatuses, PlayerDirectory } from '../platforms/types.ts'
import { startingCount } from '../players/combinePlayers.ts'
import type { MyPlayer } from '../players/combinePlayers.ts'
import { injuryTag } from '../players/injury.ts'

interface Props {
  players: MyPlayer[]
  directory: PlayerDirectory
  injuries: InjuryStatuses
}

function PlayersTable({ players, directory, injuries }: Props) {
  return (
    <div className="players-table-wrap">
      <table className="table players-table">
        <thead>
          <tr>
            <th scope="col">Player</th>
            <th scope="col" className="number">
              Leagues
            </th>
            <th scope="col">Points this week</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            // Missing when the saved player list is older than the player
            const info = directory[player.playerId]
            const injury = injuryTag(injuries[player.playerId])
            return (
              <tr key={player.playerId}>
                <th scope="row">
                  {info ? info.name : `Unknown player (${player.playerId})`}
                  {injury && (
                    <span
                      className={`badge ${injury.severity === 'out' ? 'badge-danger' : 'badge-warning'} injury injury-${injury.severity}`}
                    >
                      {injury.label}
                    </span>
                  )}
                  {info && (
                    <span className="player-meta">
                      {[info.position, info.team ?? 'Free agent'].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </th>
                <td className="number">
                  {player.leagues.length}
                  <span className="player-meta">starting {startingCount(player)}</span>
                </td>
                <td>
                  <ul className="player-leagues">
                    {player.leagues.map((entry) => (
                      <li key={entry.leagueId}>
                        <span>
                          {entry.leagueName}
                          {!entry.isStarter && <span className="bench-note"> (bench)</span>}
                        </span>
                        <span className="number">
                          {entry.points === null ? '—' : entry.points.toFixed(2)}
                          {entry.projected !== null && (
                            <span className="projected">proj {entry.projected.toFixed(2)}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default PlayersTable
