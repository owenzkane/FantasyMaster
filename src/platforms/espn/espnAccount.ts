// Connecting and disconnecting the visitor's ESPN account, through this site's own server
// (api/espn-login.js). The two ESPN values are stored by the server as cookies this page's
// JavaScript can't read, so after connecting, the page only ever asks whether it's connected.

import type { EspnAccount } from '../types.ts'

const LOGIN_URL = '/api/espn-login'

export const espnAccount: EspnAccount = {
  async status() {
    try {
      const response = await fetch(LOGIN_URL, { cache: 'no-store' })
      // No server behind /api (a static copy of the app) answers 404 or with the page itself
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        return 'unavailable'
      }
      const { connected } = (await response.json()) as { connected: boolean }
      return connected ? 'connected' : 'disconnected'
    } catch {
      return 'unavailable'
    }
  },

  async connect(espnS2, swid) {
    try {
      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ espnS2, swid }),
      })
      if (response.ok) return { ok: true }
      if (response.status === 400) {
        const { error } = (await response.json()) as { error: string }
        return { ok: false, message: error }
      }
      if (response.status === 404) {
        return { ok: false, message: 'This copy of the app can’t connect ESPN accounts.' }
      }
      return { ok: false, message: 'Couldn’t connect. Try again in a moment.' }
    } catch {
      return { ok: false, message: 'Couldn’t reach the server. Check your connection and try again.' }
    }
  },

  async disconnect() {
    await fetch(LOGIN_URL, { method: 'DELETE' })
  },
}
