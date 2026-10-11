import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasLinks, readLinks, saveLinks } from './links.ts'

// Tests run in Node, which has no local storage, so each test supplies a stand-in
function fakeStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial))
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  })
  return items
}

const KEY = 'fantasymaster.links'
const EMPTY = { sleeperUsername: null, espnLeagues: [] }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('saved links', () => {
  it('reads back what was saved', () => {
    fakeStorage()
    const links = { sleeperUsername: 'demo_user', espnLeagues: [{ leagueId: '1', teamId: '2' }] }
    saveLinks(links)
    expect(readLinks()).toEqual(links)
  })

  it('starts empty when nothing has been saved', () => {
    fakeStorage()
    expect(readLinks()).toEqual(EMPTY)
  })

  it('starts empty when local storage isn’t available at all', () => {
    // no fakeStorage(): localStorage doesn't exist here, as in some private windows
    expect(readLinks()).toEqual(EMPTY)
    expect(() => saveLinks(EMPTY)).not.toThrow()
  })

  it('ignores saved text that isn’t valid JSON', () => {
    fakeStorage({ [KEY]: 'not json {' })
    expect(readLinks()).toEqual(EMPTY)
  })

  it('drops parts of the saved data that have the wrong shape', () => {
    fakeStorage({
      [KEY]: JSON.stringify({
        sleeperUsername: 42,
        espnLeagues: [{ leagueId: '1', teamId: '2' }, { leagueId: 7 }, null, 'x'],
      }),
    })
    expect(readLinks()).toEqual({
      sleeperUsername: null,
      espnLeagues: [{ leagueId: '1', teamId: '2' }],
    })
  })
})

describe('hasLinks', () => {
  it('is true when anything is linked', () => {
    expect(hasLinks(EMPTY)).toBe(false)
    expect(hasLinks({ ...EMPTY, sleeperUsername: 'x' })).toBe(true)
    expect(hasLinks({ ...EMPTY, espnLeagues: [{ leagueId: '1', teamId: '2' }] })).toBe(true)
  })
})
