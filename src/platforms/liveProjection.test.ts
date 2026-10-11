import { describe, expect, it } from 'vitest'
import { liveProjectedTotal, projectedNow } from './liveProjection.ts'
import type { LiveGames, PlayerDirectory, PlayerPoints } from './types.ts'

const player = (
  playerId: string,
  points: number | null,
  projected: number | null,
  isStarter = true,
): PlayerPoints => ({ playerId, points, projected, isStarter })

const games: LiveGames = {
  PRE: { state: 'pre', fractionRemaining: 1 },
  IN: { state: 'in', fractionRemaining: 0.5 },
  POST: { state: 'post', fractionRemaining: 0 },
}

describe('projectedNow', () => {
  it('uses the projection for a game that hasn’t started', () => {
    expect(projectedNow(player('a', 0, 20), 'PRE', games)).toBe(20)
  })

  it('uses what really happened once the game is over, however it compares with the projection', () => {
    expect(projectedNow(player('a', 31.5, 13.9), 'POST', games)).toBe(31.5)
    expect(projectedNow(player('a', -0.16, 16.5), 'POST', games)).toBe(-0.16)
  })

  it('adds the share of the projection still to come to the points so far during a game', () => {
    // 10 so far, and half the game left on a 20-point projection
    expect(projectedNow(player('a', 10, 20), 'IN', games)).toBe(20)
  })

  it('counts only the points so far when a game is under way and he has no projection', () => {
    expect(projectedNow(player('a', 10, null), 'IN', games)).toBe(10)
  })

  it('treats no score as zero while a game is under way', () => {
    expect(projectedNow(player('a', null, 20), 'IN', games)).toBe(10)
  })

  it('falls back to the projection when his team has no game, or the scoreboard is empty', () => {
    expect(projectedNow(player('a', 0, 3), 'BYE', games)).toBe(3)
    expect(projectedNow(player('a', 0, 3), null, games)).toBe(3)
    expect(projectedNow(player('a', 12, 20), 'POST', {})).toBe(20)
  })
})

describe('liveProjectedTotal', () => {
  const directory: PlayerDirectory = {
    a: { name: 'A', position: 'QB', team: 'POST' },
    b: { name: 'B', position: 'RB', team: 'IN' },
    c: { name: 'C', position: 'WR', team: 'PRE' },
    d: { name: 'D', position: 'WR', team: 'POST' },
  }

  it('adds up each starter’s projection as of now, and leaves the bench out', () => {
    const total = liveProjectedTotal(
      [
        player('a', 30, 10), // game over: 30
        player('b', 10, 20), // half left: 10 + 10 = 20
        player('c', 0, 15), // not started: 15
        player('d', 99, 99, false), // bench
      ],
      directory,
      games,
    )
    expect(total).toBe(65)
  })

  it('rounds to two decimals', () => {
    const total = liveProjectedTotal([player('b', 0.1, 0.2)], directory, {
      IN: { state: 'in', fractionRemaining: 1 / 3 },
    })
    expect(total).toBe(0.17)
  })

  it('is null, not zero, when no starter has a number', () => {
    expect(liveProjectedTotal([player('c', 0, null)], directory, games)).toBeNull()
    expect(liveProjectedTotal([], directory, games)).toBeNull()
  })

  it('treats a player the directory doesn’t know as having no game', () => {
    expect(liveProjectedTotal([player('zzz', 5, 8)], directory, games)).toBe(8)
  })
})
