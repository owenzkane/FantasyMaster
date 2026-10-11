// Raw calls to ESPN's fantasy API. No conversion happens here.
// Unofficial: ESPN publishes no documentation for this API, so it could change without notice.

import type { EspnProblem } from '../types.ts'
import type { EspnLeagueResponse } from './espnTypes.ts'

const ESPN_URL = 'https://lm-api-reads.fantasy.espn.com'
// A path on our own dev server, which forwards to ESPN with my login cookies added.
// See vite.config.ts. It only exists while `npm run dev` is running.
const PROXY_URL = '/espn-private'
const proxyAvailable = import.meta.env.DEV

// Leagues ESPN has refused to show without a login, so later requests skip the direct attempt
const privateLeagues = new Set<string>()

function leaguePath(leagueId: string, season: string, query: string) {
  return `/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${encodeURIComponent(leagueId)}?${query}`
}

// Public leagues are fetched straight from ESPN. If ESPN answers 401 (private), the same
// request is retried through the proxy.
async function espnFetch(leagueId: string, path: string, init?: RequestInit) {
  if (!privateLeagues.has(leagueId)) {
    const direct = await fetch(ESPN_URL + path, init)
    if (direct.status !== 401) return direct
    privateLeagues.add(leagueId)
  }
  if (!proxyAvailable) return new Response(null, { status: 401 })
  return fetch(PROXY_URL + path, init)
}

// Why a private league still couldn't be read after going through the proxy
function privateProblem(response: Response): EspnProblem {
  if (!proxyAvailable) return 'privateNoProxy'
  return response.headers.get('x-espn-cookies') === 'missing' ? 'privateNoCookies' : 'privateRejected'
}

// Basic facts about a league: its name, scoring rules, teams and members.
export async function fetchEspnLeague(
  leagueId: string,
  season: string,
): Promise<EspnLeagueResponse | EspnProblem> {
  const response = await espnFetch(leagueId, leaguePath(leagueId, season, 'view=mSettings&view=mTeam'))
  if (response.status === 400 || response.status === 404) return 'notFound'
  if (response.status === 401 || response.status === 403) return privateProblem(response)
  if (!response.ok) {
    throw new Error(`ESPN request failed (${response.status}) for league ${leagueId}`)
  }
  return (await response.json()) as EspnLeagueResponse
}

// One week's games with both lineups, plus teams and members for naming the opponent.
export async function fetchEspnWeek(leagueId: string, season: string, week: number) {
  const response = await espnFetch(
    leagueId,
    leaguePath(leagueId, season, `view=mBoxscore&view=mTeam&scoringPeriodId=${week}`),
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
