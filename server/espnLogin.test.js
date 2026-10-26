// @ts-check
import { describe, expect, it } from 'vitest'
import { checkCredentials, readCredentials } from './espnCredentials.js'
import { connect, connectionStatus, disconnect } from './espnLogin.js'

const SITE = 'https://fantasymaster.example'
const S2 = 'AEB0i030BxsXZe1EaD2o9uEfFVDn2fe83JAPoWFJYHUf%2Br%2BlEnC8yX%2FST9HQgci%2BTk'
const SWID = '{6BCF5F16-6913-4192-B4CE-A36F2B0C3F02}'

/**
 * @param {string} method
 * @param {{ body?: unknown, origin?: string | null, cookie?: string, site?: string }} [options]
 */
function request(method, { body, origin = SITE, cookie, site = SITE } = {}) {
  /** @type {Record<string, string>} */
  const headers = { 'content-type': 'application/json' }
  if (origin) headers.origin = origin
  if (cookie) headers.cookie = cookie
  return new Request(`${site}/api/espn-login`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('connect', () => {
  it('stores both values as cookies the page can’t read, sent only to this site’s API', async () => {
    const response = await connect(request('POST', { body: { espnS2: S2, swid: SWID } }))
    expect(response.status).toBe(204)
    const cookies = response.headers.getSetCookie()
    expect(cookies).toHaveLength(2)
    expect(cookies[0]).toBe(
      `fm_espn_s2=${S2}; Path=/api; HttpOnly; SameSite=Strict; Secure; Max-Age=31536000`,
    )
    expect(cookies[1]).toContain(
      `fm_espn_swid=${SWID}; Path=/api; HttpOnly; SameSite=Strict; Secure`,
    )
  })

  it('leaves out Secure on the plain-HTTP local dev server, where browsers would drop it', async () => {
    const response = await connect(
      request('POST', {
        body: { espnS2: S2, swid: SWID },
        site: 'http://localhost:5173',
        origin: 'http://localhost:5173',
      }),
    )
    expect(response.headers.getSetCookie()[0]).not.toContain('Secure')
  })

  it('refuses a request from another website', async () => {
    const response = await connect(
      request('POST', { body: { espnS2: S2, swid: SWID }, origin: 'https://evil.example' }),
    )
    expect(response.status).toBe(403)
    expect(response.headers.getSetCookie()).toEqual([])
    const noOrigin = await connect(
      request('POST', { body: { espnS2: S2, swid: SWID }, origin: null }),
    )
    expect(noOrigin.status).toBe(403)
  })

  it('explains values that don’t look right, and stores nothing', async () => {
    const response = await connect(request('POST', { body: { espnS2: 'short', swid: SWID } }))
    expect(response.status).toBe(400)
    const body = /** @type {{ error: string }} */ (await response.json())
    expect(body.error).toContain('espn_s2')
    expect(response.headers.getSetCookie()).toEqual([])
  })

  it('refuses a body that isn’t JSON', async () => {
    const bad = new Request(`${SITE}/api/espn-login`, {
      method: 'POST',
      headers: { origin: SITE },
      body: 'espn_s2=abc',
    })
    expect((await connect(bad)).status).toBe(400)
  })
})

describe('disconnect', () => {
  it('clears both cookies', async () => {
    const response = await disconnect(request('DELETE'))
    expect(response.status).toBe(204)
    const cookies = response.headers.getSetCookie()
    expect(cookies).toHaveLength(2)
    expect(cookies.every((cookie) => cookie.includes('Max-Age=0'))).toBe(true)
  })

  it('refuses a request from another website', async () => {
    expect((await disconnect(request('DELETE', { origin: 'https://evil.example' }))).status).toBe(
      403,
    )
  })
})

describe('connectionStatus', () => {
  it('reports whether this browser has both values stored', async () => {
    const connected = connectionStatus(
      request('GET', { cookie: `fm_espn_s2=${S2}; fm_espn_swid=${SWID}` }),
    )
    expect(await connected.json()).toEqual({ connected: true })
    expect(await connectionStatus(request('GET')).json()).toEqual({ connected: false })
    expect(await connectionStatus(request('GET', { cookie: `fm_espn_s2=${S2}` })).json()).toEqual({
      connected: false,
    })
  })
})

describe('checkCredentials', () => {
  it('accepts the values as copied, and tidies quotes and spaces', () => {
    expect(checkCredentials(` "${S2}" `, ` ${SWID} `)).toEqual({
      ok: true,
      credentials: { s2: S2, swid: SWID },
    })
  })

  it('adds the curly braces when they were left off the SWID', () => {
    const result = checkCredentials(S2, SWID.slice(1, -1))
    expect(result).toEqual({ ok: true, credentials: { s2: S2, swid: SWID } })
  })

  it('rejects a SWID that isn’t an ID, and an espn_s2 with spaces or semicolons', () => {
    expect(checkCredentials(S2, 'not-an-id').ok).toBe(false)
    expect(checkCredentials(`${S2}; other=1`, SWID).ok).toBe(false)
    expect(checkCredentials(undefined, undefined).ok).toBe(false)
  })
})

describe('readCredentials', () => {
  it('finds the two values among other cookies', () => {
    const req = new Request(SITE, {
      headers: { cookie: `theme=dark; fm_espn_swid=${SWID}; fm_espn_s2=${S2}` },
    })
    expect(readCredentials(req)).toEqual({ s2: S2, swid: SWID })
  })
})
