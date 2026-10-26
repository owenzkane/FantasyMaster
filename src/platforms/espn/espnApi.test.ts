import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchEspnLeague } from './espnApi.ts'

// Each test plays ESPN and our server: `direct` answers requests to ESPN, `proxy` answers
// requests to /api/espn. Different league IDs per test, since private leagues are remembered.
function serve(direct: () => Response, proxy?: () => Response) {
  const calls: string[] = []
  vi.stubGlobal('fetch', async (input: string) => {
    calls.push(input)
    if (input.startsWith('/api/espn?target=')) {
      if (!proxy) throw new Error('unexpected proxy call')
      return proxy()
    }
    return direct()
  })
  return calls
}
const fromServer = (status: number, login: 'set' | 'missing', body: unknown = {}) =>
  Response.json(body, { status, headers: { 'x-espn-cookies': login } })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchEspnLeague', () => {
  it('reads a public league straight from ESPN, without our server', async () => {
    const calls = serve(() => Response.json({ id: 1 }))
    expect(await fetchEspnLeague('1', '2026')).toEqual({ id: 1 })
    expect(calls).toHaveLength(1)
  })

  it('reports a league that doesn’t exist', async () => {
    serve(() => new Response(null, { status: 400 }))
    expect(await fetchEspnLeague('2', '2026')).toBe('notFound')
  })

  it('retries a private league through our server, passing the ESPN address along', async () => {
    const calls = serve(
      () => new Response(null, { status: 401 }),
      () => fromServer(200, 'set', { id: 3 }),
    )
    expect(await fetchEspnLeague('3', '2026')).toEqual({ id: 3 })
    const target = decodeURIComponent(calls[1].split('target=')[1])
    expect(target).toBe(
      '/apis/v3/games/ffl/seasons/2026/segments/0/leagues/3?view=mSettings&view=mTeam',
    )
  })

  it('asks for an ESPN login when none is connected', async () => {
    serve(
      () => new Response(null, { status: 401 }),
      () => fromServer(401, 'missing'),
    )
    expect(await fetchEspnLeague('4', '2026')).toBe('privateNoCookies')
  })

  it('reports a login ESPN refused', async () => {
    serve(
      () => new Response(null, { status: 401 }),
      () => fromServer(401, 'set'),
    )
    expect(await fetchEspnLeague('5', '2026')).toBe('privateRejected')
  })

  it('knows when there’s no server to go through, as on a plain static host', async () => {
    serve(
      () => new Response(null, { status: 401 }),
      () => new Response('Not found', { status: 404 }),
    )
    expect(await fetchEspnLeague('6', '2026')).toBe('privateNoProxy')
    // some hosts answer every address with the page itself
    serve(
      () => new Response(null, { status: 401 }),
      () => new Response('<!doctype html>'),
    )
    expect(await fetchEspnLeague('7', '2026')).toBe('privateNoProxy')
  })

  it('goes straight to our server for a league it already knows is private', async () => {
    const first = serve(
      () => new Response(null, { status: 401 }),
      () => fromServer(200, 'set', {}),
    )
    await fetchEspnLeague('8', '2026')
    expect(first).toHaveLength(2)
    const second = serve(
      () => Response.json({}),
      () => fromServer(200, 'set', {}),
    )
    await fetchEspnLeague('8', '2026')
    expect(second).toHaveLength(1)
    expect(second[0]).toMatch(/^\/api\/espn/)
  })
})
