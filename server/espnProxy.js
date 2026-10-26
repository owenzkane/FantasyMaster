// @ts-check
// Forwards a request for a private ESPN league to ESPN, adding the visitor's ESPN login.
// A web page isn't allowed to set the Cookie header on a request to another site; a server is.

import { readCredentials } from './espnCredentials.js'

const ESPN_URL = 'https://lm-api-reads.fantasy.espn.com'

// The only ESPN addresses this will fetch: one fantasy football league, by season and ID.
// Anything else is refused, so the proxy can't be used to reach other sites or other parts
// of ESPN.
const LEAGUE_PATH = /^\/apis\/v3\/games\/ffl\/seasons\/\d{4}\/segments\/0\/leagues\/\d{1,12}$/

/**
 * @param {number} status
 * @param {string} message
 */
function refuse(status, message) {
  return Response.json({ error: message }, { status, headers: { 'cache-control': 'no-store' } })
}

/**
 * Handles GET /api/espn?target=<ESPN path and query>
 * @param {Request} request
 * @param {typeof fetch} [fetchFromEspn] replaced in tests, so they never reach ESPN
 * @returns {Promise<Response>}
 */
export async function proxyEspn(request, fetchFromEspn = fetch) {
  if (request.method !== 'GET') return refuse(405, 'Only reading is allowed.')

  const target = new URL(request.url).searchParams.get('target')
  if (!target) return refuse(400, 'Missing target.')
  // Resolving against ESPN's address means a target can't point anywhere else
  const espnUrl = new URL(target, ESPN_URL)
  if (espnUrl.origin !== ESPN_URL || !LEAGUE_PATH.test(espnUrl.pathname)) {
    return refuse(404, 'Not an ESPN league address.')
  }

  const credentials = readCredentials(request)
  /** @type {Record<string, string>} */
  const headers = { accept: 'application/json' }
  if (credentials) headers.cookie = `espn_s2=${credentials.s2}; SWID=${credentials.swid}`
  // The one-week filter the app sends with matchup requests
  const filter = request.headers.get('x-fantasy-filter')
  if (filter) headers['x-fantasy-filter'] = filter

  const response = await fetchFromEspn(espnUrl, { headers, redirect: 'manual' })
  return new Response(await response.arrayBuffer(), {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
      // League data is personal: never let a shared cache keep it
      'cache-control': 'no-store',
      // Lets the page tell "not connected" apart from "ESPN refused the login"
      'x-espn-cookies': credentials ? 'set' : 'missing',
    },
  })
}
