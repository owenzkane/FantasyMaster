// Runs before every test file. Tests must never touch the network, so `fetch` is replaced:
// the one file the app loads by relative address is served from disk, and anything else fails.

import { readFileSync } from 'node:fs'
import { vi } from 'vitest'

const players = readFileSync(new URL('./public/sleeper-players.json', import.meta.url), 'utf8')

vi.stubGlobal('fetch', async (input: string | URL | Request) => {
  const url = input instanceof Request ? input.url : String(input)
  if (url.endsWith('sleeper-players.json')) return new Response(players)
  throw new Error(`A test tried to use the network: ${url}`)
})
