import type { LeagueSummary } from '../hooks/useLeagues.ts'
import type { PlayerDirectory } from '../platforms/types.ts'
import LeagueCard from './LeagueCard.tsx'
import type { WeekTiming } from './LeagueCard.tsx'

interface Props {
  leagues: LeagueSummary[]
  timing: WeekTiming
  directory: PlayerDirectory
}

function LeagueList({ leagues, timing, directory }: Props) {
  return (
    <ul className="league-list">
      {leagues.map((summary) => (
        <LeagueCard
          key={summary.league.id}
          summary={summary}
          timing={timing}
          directory={directory}
        />
      ))}
    </ul>
  )
}

export default LeagueList
