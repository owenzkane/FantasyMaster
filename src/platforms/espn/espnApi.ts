// Raw calls to ESPN's fantasy API. No conversion happens here.
// Unofficial: ESPN publishes no documentation for this API, so it could change without notice.

import type { EspnLeagueResponse } from './espnTypes.ts'

const BASE_URL = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons'

function leagueUrl(leagueId: string, season: string, query: string) {
  return `${BASE_URL}/${season}/segments/0/leagues/${encodeURIComponent(leagueId)}?${query}`
}

// Basic facts about a league: its name, scoring rules, teams and members.
// null when the league doesn't exist (400/404) or is private (401).
export async function fetchEspnLeague(leagueId: string, season: string) {
  const response = await fetch(leagueUrl(leagueId, season, 'view=mSettings&view=mTeam'))
  if ([400, 401, 404].includes(response.status)) return null
  if (!response.ok) {
    throw new Error(`ESPN request failed (${response.status}) for league ${leagueId}`)
  }
  return (await response.json()) as EspnLeagueResponse
}

// One week's games with both lineups, plus teams and members for naming the opponent.
export async function fetchEspnWeek(leagueId: string, season: string, week: number) {
  const response = await fetch(
    leagueUrl(leagueId, season, `view=mBoxscore&view=mTeam&scoringPeriodId=${week}`),
    {
      // Without this filter ESPN sends every week's schedule (about 3 MB); with it, one week
      headers: {
        'x-fantasy-filter': JSON.stringify({
          schedule: { filterMatchupPeriodIds: { value: [week] } },
        }),
      },
    },
  )
  if (!response.ok) {
    throw new Error(`ESPN request failed (${response.status}) for league ${leagueId}`)
  }
  return (await response.json()) as EspnLeagueResponse
}
