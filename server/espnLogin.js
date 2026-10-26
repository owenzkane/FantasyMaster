// @ts-check
// Connecting and disconnecting an ESPN account: GET /api/espn-login says whether this browser
// is connected, POST stores the two values, DELETE removes them.

import {
  checkCredentials,
  credentialCookies,
  fromThisSite,
  readCredentials,
} from './espnCredentials.js'

const NO_STORE = { 'cache-control': 'no-store' }

/**
 * The page can't read the HttpOnly cookies itself, so it asks here.
 * @param {Request} request
 */
export function connectionStatus(request) {
  return Response.json({ connected: readCredentials(request) !== null }, { headers: NO_STORE })
}

/**
 * Body: { "espnS2": "...", "swid": "{...}" }
 * @param {Request} request
 */
export async function connect(request) {
  if (!fromThisSite(request)) return Response.json({ error: 'Not allowed.' }, { status: 403 })

  /** @type {{ espnS2?: unknown, swid?: unknown }} */
  let body = {}
  try {
    const parsed = await request.json()
    if (typeof parsed === 'object' && parsed !== null) body = parsed
  } catch {
    return Response.json({ error: 'Send the two values as JSON.' }, { status: 400 })
  }
  const checked = checkCredentials(body.espnS2, body.swid)
  if (!checked.ok) return Response.json({ error: checked.message }, { status: 400 })

  const headers = new Headers(NO_STORE)
  for (const cookie of credentialCookies(request, checked.credentials)) {
    headers.append('set-cookie', cookie)
  }
  return new Response(null, { status: 204, headers })
}

/** @param {Request} request */
export function disconnect(request) {
  if (!fromThisSite(request)) return Response.json({ error: 'Not allowed.' }, { status: 403 })
  const headers = new Headers(NO_STORE)
  for (const cookie of credentialCookies(request, null)) headers.append('set-cookie', cookie)
  return new Response(null, { status: 204, headers })
}
