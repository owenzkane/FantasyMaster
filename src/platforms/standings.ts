// Where one team stands against the rest of its league.

interface TeamRecord {
  wins: number
  losses: number
  ties: number
  pointsFor: number
}

// Wins minus losses. Among teams that have played the same number of games, a higher value
// means a better record, and a tie moves it neither way.
function margin(record: TeamRecord) {
  return record.wins - record.losses
}

// How far behind the league's best record a team is. Each win or loss of difference is half
// a game, so 3-1 is one game behind 4-0 (one more loss, one fewer win). Zero means first place,
// possibly shared. Checked against ESPN's own gamesBack: all eight teams in the fixture agree.
export function gamesBehind(mine: TeamRecord, everyone: TeamRecord[]) {
  const best = Math.max(...everyone.map(margin), margin(mine))
  return (best - margin(mine)) / 2
}

// The whole league's scoring rate: every team's points over every team's games.
// null before any game has been played.
export function leaguePointsPerGame(everyone: TeamRecord[]) {
  const games = everyone.reduce((sum, team) => sum + team.wins + team.losses + team.ties, 0)
  if (games === 0) return null
  return everyone.reduce((sum, team) => sum + team.pointsFor, 0) / games
}
