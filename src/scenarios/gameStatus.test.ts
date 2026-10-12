import { describe, expect, it } from 'vitest'
import { gameState, isSettled } from './gameStatus.ts'

const directory = {
  early: { name: 'Early Guy', position: 'WR', team: 'GB' },
  now: { name: 'Now Guy', position: 'RB', team: 'DEN' },
  late: { name: 'Late Guy', position: 'QB', team: 'BUF' },
  off: { name: 'Bye Guy', position: 'TE', team: 'KC' },
  agent: { name: 'Free Agent', position: 'WR', team: null },
}
const games = {
  GB: { state: 'post' as const, fractionRemaining: 0 },
  DEN: { state: 'in' as const, fractionRemaining: 0.4 },
  BUF: { state: 'pre' as const, fractionRemaining: 1 },
}
const stats = { early: { rec: 5 }, now: { rush_yd: 30 } }
const current = { timing: 'current' as const, games, directory, stats }

describe('gameState in the week in progress', () => {
  it('follows his team’s game: over, under way, or still to come', () => {
    expect(gameState('early', current)).toBe('final')
    expect(gameState('now', current)).toBe('live')
    expect(gameState('late', current)).toBe('upcoming')
  })

  it('is a bye when his team has no game on the scoreboard', () => {
    expect(gameState('off', current)).toBe('bye')
  })

  it('is unknown when the scoreboard wasn’t available', () => {
    expect(gameState('early', { ...current, games: {} })).toBeNull()
  })

  it('is unknown for a player with no team, or one the directory doesn’t know', () => {
    expect(gameState('agent', current)).toBeNull()
    expect(gameState('stranger', current)).toBeNull()
  })
})

describe('gameState in other weeks', () => {
  it('is always upcoming in a future week', () => {
    expect(gameState('early', { ...current, timing: 'future' })).toBe('upcoming')
    expect(gameState('off', { ...current, timing: 'future', games: {} })).toBe('upcoming')
  })

  it('in a past week, is final for a player with a stat line and "did not play" for one without', () => {
    const past = { ...current, timing: 'past' as const, games: {} }
    expect(gameState('early', past)).toBe('final')
    expect(gameState('late', past)).toBe('didNotPlay')
  })

  it('in a past week, assumes he played when no stats loaded at all', () => {
    expect(gameState('late', { ...current, timing: 'past', stats: {} })).toBe('final')
  })
})

describe('isSettled', () => {
  it('is true once his score can’t change', () => {
    expect(isSettled('final')).toBe(true)
    expect(isSettled('bye')).toBe(true)
    expect(isSettled('didNotPlay')).toBe(true)
  })

  it('is false while he can still score, or when it isn’t known', () => {
    expect(isSettled('upcoming')).toBe(false)
    expect(isSettled('live')).toBe(false)
    expect(isSettled(null)).toBe(false)
  })
})
