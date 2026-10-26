import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { EspnAccount, EspnConnection } from '../platforms/types.ts'
import EspnConnect from './EspnConnect.tsx'

const account: EspnAccount = {
  status: async () => 'disconnected',
  connect: async () => ({ ok: true }),
  disconnect: async () => {},
}

function text(connection: EspnConnection | null, open: boolean) {
  const html = renderToStaticMarkup(
    <EspnConnect
      account={account}
      connection={connection}
      onConnectionChange={() => {}}
      open={open}
      onOpen={() => {}}
      onClose={() => {}}
      onConnected={() => {}}
    />,
  )
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('EspnConnect', () => {
  it('shows nothing until it knows whether this browser is connected', () => {
    expect(text(null, false)).toBe('')
  })

  it('offers to connect when not connected', () => {
    expect(text('disconnected', false)).toBe('Private league? Connect your ESPN account')
  })

  it('says it’s connected and offers to disconnect', () => {
    expect(text('connected', false)).toBe('ESPN account connected for private leagues. Disconnect')
  })

  it('says plainly when this copy of the app can’t open private leagues', () => {
    expect(text('unavailable', true)).toContain('can’t be opened on this copy of the app')
    expect(text('unavailable', true)).not.toContain('espn_s2')
  })

  it('explains, step by step, where to find the two values', () => {
    const page = text('disconnected', true)
    expect(page).toContain('Connect your ESPN account')
    expect(page).toContain('sign in at espn.com')
    expect(page).toContain('Phone browsers don’t show these values')
    for (const browser of ['Chrome or Edge:', 'Firefox:', 'Safari:'])
      expect(page).toContain(browser)
    expect(page).toContain('Find the rows named espn_s2 and SWID')
  })

  it('explains what happens to the values', () => {
    const page = text('disconnected', true)
    expect(page).toContain('kept only in this browser')
    expect(page).toContain('never saves or records them')
    expect(page).toContain('don’t share them')
    expect(page).toContain('stop working when you sign out of ESPN')
  })

  it('asks to update the login, not connect, when one is already stored', () => {
    expect(text('connected', true)).toContain('Update your ESPN login')
  })
})
