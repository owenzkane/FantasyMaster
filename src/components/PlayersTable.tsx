import type { PlayerDirectory } from '../platforms/types.ts'
import type { MyPlayer } from '../players/combinePlayers.ts'

interface Props {
  players: MyPlayer[]
  directory: PlayerDirectory
}

function PlayersTable({ players, directory }: Props) {
  return (
    <div className="players-table-wrap">
      <table className="players-table">
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
            return (
              <tr key={player.playerId}>
                <th scope="row">
                  {info ? info.name : `Unknown player (${player.playerId})`}
                  {info && (
                    <span className="player-meta">
                      {[info.position, info.team ?? 'Free agent'].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </th>
                <td className="number">{player.leagues.length}</td>
                <td>
                  <ul className="player-leagues">
                    {player.leagues.map((entry) => (
                      <li key={entry.leagueId}>
                        <span>{entry.leagueName}</span>
                        <span className="number">
                          {entry.points === null ? '—' : entry.points.toFixed(2)}
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
