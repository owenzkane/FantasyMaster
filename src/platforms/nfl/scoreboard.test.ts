import { describe, expect, it } from 'vitest'
import { toLiveGames } from './scoreboard.ts'
import type { ScoreboardResponse } from './scoreboard.ts'

const event = (home: string, away: string, state: string, period = 0, clock = 0) => ({
  status: { period, clock, type: { state } },
  competitions: [{ competitors: [{ team: { abbreviation: home } }, { team: { abbreviation: away } }] }],
})
const scoreboard = (...events: ReturnType<typeof event>[]): ScoreboardResponse => ({
  week: { number: 5 },
  events,
})

describe('toLiveGames', () => {
  it('marks both teams in a game, before and after it', () => {
    const games = toLiveGames(scoreboard(event('GB', 'CHI', 'post'), event('SEA', 'SF', 'pre')), 5)
    expect(games.GB).toEqual({ state: 'post', fractionRemaining: 0 })
    expect(games.CHI).toEqual({ state: 'post', fractionRemaining: 0 })
    expect(games.SF).toEqual({ state: 'pre', fractionRemaining: 1 })
  })

  it('works out how much of a game under way is left', () => {
    // 4th quarter, 0:45 left
    expect(toLiveGames(scoreboard(event('MIA', 'CIN', 'in', 4, 45)), 5).MIA?.fractionRemaining).toBeCloseTo(45 / 3600)
    // 1st quarter with 10 minutes left: 45 + 10 minutes of 60
    expect(toLiveGames(scoreboard(event('LAC', 'DEN', 'in', 1, 600)), 5).DEN?.fractionRemaining).toBeCloseTo(55 / 60)
    // halftime: two quarters done
    expect(toLiveGames(scoreboard(event('LAC', 'DEN', 'in', 2, 0)), 5).LAC?.fractionRemaining).toBe(0.5)
  })

  it('counts a game in overtime as nearly over', () => {
    expect(toLiveGames(scoreboard(event('NYG', 'WSH', 'in', 5, 400)), 5).NYG?.fractionRemaining).toBe(0)
  })

  it('uses Sleeper’s abbreviation for Washington', () => {
    const games = toLiveGames(scoreboard(event('NYG', 'WSH', 'pre')), 5)
    expect(games.WAS).toBeDefined()
    expect(games.WSH).toBeUndefined()
  })

  it('leaves out teams on a bye, which have no event', () => {
    expect(toLiveGames(scoreboard(event('GB', 'CHI', 'post')), 5).KC).toBeUndefined()
  })

  it('gives nothing when the scoreboard is showing a different week', () => {
    expect(toLiveGames(scoreboard(event('GB', 'CHI', 'post')), 6)).toEqual({})
    expect(toLiveGames({ events: [] }, 5)).toEqual({})
  })
})
