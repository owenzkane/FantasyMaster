// What the user has linked, remembered in the browser's local storage between visits.

import { usingMock } from '../platforms/index.ts'

export interface EspnLink {
  leagueId: string
  teamId: string
}

export interface Links {
  sleeperUsername: string | null
  espnLeagues: EspnLink[]
}

const NO_LINKS: Links = { sleeperUsername: null, espnLeagues: [] }

// Mock and real data get separate entries, so demo_user never shows up against the real services
const STORAGE_KEY = usingMock ? 'fantasymaster.links.mock' : 'fantasymaster.links'

export function hasLinks(links: Links) {
  return links.sleeperUsername !== null || links.espnLeagues.length > 0
}

// Local storage can be unavailable (private windows) or hold anything, so nothing here is trusted
export function readLinks(): Links {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (typeof saved !== 'object' || saved === null) return NO_LINKS
    const { sleeperUsername, espnLeagues } = saved as Record<string, unknown>
    return {
      sleeperUsername: typeof sleeperUsername === 'string' ? sleeperUsername : null,
      espnLeagues: Array.isArray(espnLeagues)
        ? espnLeagues.filter(
            (link): link is EspnLink =>
              typeof link?.leagueId === 'string' && typeof link?.teamId === 'string',
          )
        : [],
    }
  } catch {
    return NO_LINKS
  }
}

export function saveLinks(links: Links) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links))
  } catch {
    // Not being able to remember the links shouldn't stop the page working
  }
}
