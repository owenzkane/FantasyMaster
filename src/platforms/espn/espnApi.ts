// Raw calls to ESPN's fantasy API. No conversion happens here.
// Unofficial: ESPN publishes no documentation for this API, so it could change without notice.

import type { EspnProblem } from '../types.ts'
import type { EspnLeagueResponse } from './espnTypes.ts'

const ESPN_URL = 'https://lm-api-reads.fantasy.espn.com'
// This site's own server function (api/espn.js), which forwards a request to ESPN with the
// visitor's ESPN login added. It's served by Vercel when deployed and by the dev server locally.
const PROXY_URL = '/api/espn'

// Leagues ESPN has refused to show without a login, so later requests skip the direct attempt
const privateLeagues = new Set<string>()

function leaguePath(leagueId: string, season: string, query: string) {
  return `/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${encodeURIComponent(leagueId)}?${query}`
}

// Public leagues are fetched straight from ESPN. If ESPN answers 401 (private), the same
// request is retried through our server.
async function espnFetch(leagueId: string, path: string, init?: RequestInit) {
  if (!privateLeagues.has(leagueId)) {
    const direct = await fetch(ESPN_URL + path, init)
    if (direct.status !== 401) return direct
    privateLeagues.add(leagueId)
  }
  return fetch(`${PROXY_URL}?target=${encodeURIComponent(path)}`, init)
}

// Why a private league still couldn't be read after going through our server
function privateProblem(response: Response): EspnProblem | null {
  const login = response.headers.get('x-espn-cookies')
  // Only our server adds this header; without it, nothing answered at /api/espn
  if (login === null) return 'privateNoProxy'
  if (response.status !== 401 && response.status !== 403) return null
  return login === 'missing' ? 'privateNoCookies' : 'privateRejected'
}

// Basic facts about a league: its name, scoring rules, teams and members.
export async function fetchEspnLeague(
  leagueId: string,
  season: string,
): Promise<EspnLeagueResponse | EspnProblem> {
  const response = await espnFetch(leagueId, leaguePath(leagueId, season, 'view=mSettings&view=mTeam'))
  if (privateLeagues.has(leagueId)) {
    const problem = privateProblem(response)
    if (problem) return problem
  }
  if (response.status === 400 || response.status === 404) return 'notFound'
  if (!response.ok) {
    throw new Error(`ESPN request failed (${response.status}) for league ${leagueId}`)
  }
  return (await response.json()) as EspnLeagueResponse
}

// One week's games with both lineups, plus teams and members for naming the opponent.
export async function fetchEspnWeek(leagueId: string, season: string, week: number) {
  const response = await espnFetch(
    leagueId,
    // mMatchupScore adds ESPN's own live projected totals for each team
    leaguePath(
      leagueId,
      season,
      `view=mBoxscore&view=mMatchupScore&view=mTeam&scoringPeriodId=${week}`,
    ),
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
