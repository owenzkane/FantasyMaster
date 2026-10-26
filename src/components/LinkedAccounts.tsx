import type { Links } from '../hooks/links.ts'
import type { LeagueSummary } from '../hooks/useLeagues.ts'

interface Props {
  links: Links
  // used to show ESPN league names once they're loaded
  leagues: LeagueSummary[]
  disabled: boolean
  onRemoveSleeper: () => void
  onRemoveEspnLeague: (leagueId: string) => void
}

function LinkedAccounts({ links, leagues, disabled, onRemoveSleeper, onRemoveEspnLeague }: Props) {
  const espnName = (leagueId: string) =>
    leagues.find(({ league }) => league.platform === 'espn' && league.id === leagueId)?.league
      .name ?? `League ${leagueId}`

  const count = (links.sleeperUsername ? 1 : 0) + links.espnLeagues.length

  return (
    // <details> is the browser's built-in expand/collapse; it starts closed so a long list
    // takes up one line until it's opened
    <details className="linked-details">
      <summary>Linked accounts ({count})</summary>
      <ul className="linked-accounts">
        {links.sleeperUsername && (
          <li>
            <span>Sleeper: {links.sleeperUsername}</span>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={disabled}
              onClick={onRemoveSleeper}
            >
              Remove
            </button>
          </li>
        )}
        {links.espnLeagues.map((link) => (
          <li key={link.leagueId}>
            <span>ESPN: {espnName(link.leagueId)}</span>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={disabled}
              onClick={() => onRemoveEspnLeague(link.leagueId)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}

export default LinkedAccounts
