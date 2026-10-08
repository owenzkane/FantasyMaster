import type { LeagueMatchup } from '../hooks/useLeagues.ts'
import LeagueCard from './LeagueCard.tsx'

interface Props {
  leagues: LeagueMatchup[]
}

function LeagueList({ leagues }: Props) {
  return (
    <ul className="league-list">
      {leagues.map(({ league, matchup }) => (
        <LeagueCard key={league.id} league={league} matchup={matchup} />
      ))}
    </ul>
  )
}

export default LeagueList
