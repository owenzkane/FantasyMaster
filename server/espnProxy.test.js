// @ts-check
import { describe, expect, it } from 'vitest'
import { proxyEspn } from './espnProxy.js'

const SITE = 'https://fantasymaster.example'
const LEAGUE = '/apis/v3/games/ffl/seasons/2026/segments/0/leagues/1798387375?view=mTeam'
const COOKIES = 'fm_espn_s2=AEBabc%2Bdef; fm_espn_swid={6BCF5F16-6913-4192-B4CE-A36F2B0C3F02}'

/**
 * A request to the proxy, and a stand-in for ESPN that records what it was sent.
 * @param {string} target
 * @param {Record<string, string>} [headers]
 * @param {number} [espnStatus]
 */
async function call(target, headers = {}, espnStatus = 200, method = 'GET') {
  /** @type {{ url: string, headers: Record<string, string> }[]} */
  const sent = []
  /** @type {typeof fetch} */
  const fakeEspn = async (url, init) => {
    sent.push({ url: String(url), headers: /** @type {Record<string, string>} */ (init?.headers) })
    return Response.json({ id: 1798387375 }, { status: espnStatus })
  }
  const request = new Request(`${SITE}/api/espn?target=${encodeURIComponent(target)}`, {
    method,
    headers,
  })
  const response = await proxyEspn(request, fakeEspn)
  return { response, sent }
}

describe('proxyEspn', () => {
  it('forwards a league request to ESPN with the visitor’s login added', async () => {
    const { response, sent } = await call(LEAGUE, { cookie: COOKIES })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: 1798387375 })
    expect(sent[0].url).toBe(`https://lm-api-reads.fantasy.espn.com${LEAGUE}`)
    expect(sent[0].headers.cookie).toBe(
      'espn_s2=AEBabc%2Bdef; SWID={6BCF5F16-6913-4192-B4CE-A36F2B0C3F02}',
    )
  })

  it('passes the one-week filter header through', async () => {
    const filter = '{"schedule":{"filterMatchupPeriodIds":{"value":[5]}}}'
    const { sent } = await call(LEAGUE, { cookie: COOKIES, 'x-fantasy-filter': filter })
    expect(sent[0].headers['x-fantasy-filter']).toBe(filter)
  })

  it('says whether a login was sent, so the page can explain a refusal', async () => {
    const withLogin = await call(LEAGUE, { cookie: COOKIES }, 401)
    expect(withLogin.response.status).toBe(401)
    expect(withLogin.response.headers.get('x-espn-cookies')).toBe('set')

    const without = await call(LEAGUE, {}, 401)
    expect(without.response.headers.get('x-espn-cookies')).toBe('missing')
    expect(without.sent[0].headers.cookie).toBeUndefined()
  })

  it('ignores other cookies the browser sends', async () => {
    const { sent } = await call(LEAGUE, { cookie: 'theme=dark; fm_espn_s2=abc' })
    // only half the login is there, so nothing is added
    expect(sent[0].headers.cookie).toBeUndefined()
  })

  it('never lets the answer be cached', async () => {
    const { response } = await call(LEAGUE, { cookie: COOKIES })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('refuses anything that isn’t an ESPN fantasy league address, without contacting ESPN', async () => {
    for (const target of [
      'https://example.com/steal',
      '//example.com/apis/v3/games/ffl/seasons/2026/segments/0/leagues/1',
      '/apis/v3/games/ffl/seasons/2026/players',
      '/apis/v3/games/fba/seasons/2026/segments/0/leagues/1',
      '/apis/v3/games/ffl/seasons/2026/segments/0/leagues/1/../../../../players',
      '/fans/{6BCF5F16-6913-4192-B4CE-A36F2B0C3F02}',
    ]) {
      const { response, sent } = await call(target, { cookie: COOKIES })
      expect(response.status, target).toBe(404)
      expect(sent, target).toEqual([])
    }
  })

  it('refuses a request with no target', async () => {
    const request = new Request(`${SITE}/api/espn`)
    expect((await proxyEspn(request)).status).toBe(400)
  })

  it('only reads', async () => {
    const { response, sent } = await call(LEAGUE, { cookie: COOKIES }, 200, 'POST')
    expect(response.status).toBe(405)
    expect(sent).toEqual([])
  })
})
