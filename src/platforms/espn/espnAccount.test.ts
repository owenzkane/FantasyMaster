import { afterEach, describe, expect, it, vi } from 'vitest'
import { espnAccount } from './espnAccount.ts'

function serve(respond: (init?: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init?: RequestInit }[] = []
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    return respond(init)
  })
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('espnAccount.status', () => {
  it('asks our server whether this browser is connected', async () => {
    serve(() => Response.json({ connected: true }))
    expect(await espnAccount.status()).toBe('connected')
    serve(() => Response.json({ connected: false }))
    expect(await espnAccount.status()).toBe('disconnected')
  })

  it('is unavailable when there’s no server: a 404, the page itself, or no answer', async () => {
    serve(() => new Response('Not found', { status: 404 }))
    expect(await espnAccount.status()).toBe('unavailable')
    serve(() => new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } }))
    expect(await espnAccount.status()).toBe('unavailable')
    serve(() => Promise.reject(new TypeError('Failed to fetch')))
    expect(await espnAccount.status()).toBe('unavailable')
  })
})

describe('espnAccount.connect', () => {
  it('sends both values to our server as JSON', async () => {
    const calls = serve(() => new Response(null, { status: 204 }))
    expect(await espnAccount.connect('AEBabc', '{X}')).toEqual({ ok: true })
    expect(calls[0].url).toBe('/api/espn-login')
    expect(calls[0].init?.method).toBe('POST')
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ espnS2: 'AEBabc', swid: '{X}' })
  })

  it('passes on the server’s explanation when the values look wrong', async () => {
    serve(() => Response.json({ error: 'That SWID doesn’t look right.' }, { status: 400 }))
    expect(await espnAccount.connect('a', 'b')).toEqual({
      ok: false,
      message: 'That SWID doesn’t look right.',
    })
  })

  it('explains when this copy of the app has no server', async () => {
    serve(() => new Response(null, { status: 404 }))
    expect(await espnAccount.connect('a', 'b')).toEqual({
      ok: false,
      message: 'This copy of the app can’t connect ESPN accounts.',
    })
  })
})

describe('espnAccount.disconnect', () => {
  it('asks our server to remove the stored values', async () => {
    const calls = serve(() => new Response(null, { status: 204 }))
    await espnAccount.disconnect()
    expect(calls[0]).toMatchObject({ url: '/api/espn-login', init: { method: 'DELETE' } })
  })
})
