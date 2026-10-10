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

  return (
    <ul className="linked-accounts" aria-label="Linked accounts">
      {links.sleeperUsername && (
        <li>
          <span>Sleeper: {links.sleeperUsername}</span>
          <button type="button" disabled={disabled} onClick={onRemoveSleeper}>
            Remove
          </button>
        </li>
      )}
      {links.espnLeagues.map((link) => (
        <li key={link.leagueId}>
          <span>ESPN: {espnName(link.leagueId)}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRemoveEspnLeague(link.leagueId)}
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  )
}

export default LinkedAccounts
