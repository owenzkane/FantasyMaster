import { describe, expect, it } from 'vitest'
import type { PlayerDirectory } from '../types.ts'
import { toSleeperPlayerId } from './espnPlayers.ts'
import type { EspnPlayer } from './espnTypes.ts'

// A tiny hand-made player list, so each matching rule can be tested on its own
const directory: PlayerDirectory = {
  '100': { name: 'Josh Allen', position: 'QB', team: 'BUF', espnId: 3918298 },
  '101': { name: 'Marvin Harrison', position: 'WR', team: 'ARI' },
  '102': { name: 'Travis Hunter', position: 'DB', team: 'JAX' },
  '103': { name: 'Mike Williams', position: 'WR', team: 'LAC' },
  '104': { name: 'Mike Williams', position: 'WR', team: 'PIT' },
  '105': { name: 'Josh Allen', position: 'LB', team: 'JAX' },
  BUF: { name: 'Buffalo Bills', position: 'DEF', team: 'BUF' },
}

// ESPN numbers: position 1 QB, 3 WR, 16 D/ST; team 2 BUF, 22 ARI, 23 PIT, 24 LAC, 30 JAX
const espn = (id: number, fullName: string, defaultPositionId: number, proTeamId: number) =>
  ({ id, fullName, defaultPositionId, proTeamId }) satisfies EspnPlayer

describe('toSleeperPlayerId', () => {
  it('uses Sleeper’s record of the ESPN ID when there is one', () => {
    expect(toSleeperPlayerId(espn(3918298, 'Joshua Allen', 1, 2), directory)).toBe('100')
  })

  it('falls back to name and position, ignoring suffixes like "Jr."', () => {
    expect(toSleeperPlayerId(espn(1, 'Marvin Harrison Jr.', 3, 22), directory)).toBe('101')
  })

  it('tells two players with the same name and position apart by NFL team', () => {
    expect(toSleeperPlayerId(espn(2, 'Mike Williams', 3, 23), directory)).toBe('104')
    expect(toSleeperPlayerId(espn(3, 'Mike Williams', 3, 24), directory)).toBe('103')
  })

  it('matches by name and team when the services disagree on position', () => {
    // ESPN lists him as a wide receiver, Sleeper as a defensive back
    expect(toSleeperPlayerId(espn(4, 'Travis Hunter', 3, 30), directory)).toBe('102')
  })

  it('matches a team defense by its NFL team', () => {
    expect(toSleeperPlayerId(espn(-16002, 'Bills D/ST', 16, 2), directory)).toBe('BUF')
  })

  it('gives an "espn:" ID when nothing matches, or the match is ambiguous', () => {
    expect(toSleeperPlayerId(espn(5, 'Nobody Atall', 3, 2), directory)).toBe('espn:5')
    // two Mike Williams at WR, neither on Buffalo
    expect(toSleeperPlayerId(espn(6, 'Mike Williams', 3, 2), directory)).toBe('espn:6')
  })
})
