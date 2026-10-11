import type { PlayerDirectory, PlayerPoints } from '../platforms/types.ts'

interface Props {
  title: string
  // starters only
  players: PlayerPoints[]
  directory: PlayerDirectory
}

function Lineup({ title, players, directory }: Props) {
  return (
    <div className="lineup">
      <h4>{title}</h4>
      <ul>
        {players.map((player) => {
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
              <span className="number">
                {player.points === null ? '—' : player.points.toFixed(2)}
                {player.projected !== null && (
                  <span className="projected">proj {player.projected.toFixed(2)}</span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default Lineup
