import { describe, expect, it } from 'vitest'
import { gamesBehind, leaguePointsPerGame } from './standings.ts'

const team = (wins: number, losses: number, pointsFor = 0, ties = 0) => ({ wins, losses, ties, pointsFor })

describe('gamesBehind', () => {
  const league = [team(4, 0), team(3, 1), team(2, 2), team(0, 4)]

  it('is zero for the team with the best record', () => {
    expect(gamesBehind(team(4, 0), league)).toBe(0)
  })

  it('counts one game for each win fewer and loss more than the leader, halved', () => {
    expect(gamesBehind(team(3, 1), league)).toBe(1)
    expect(gamesBehind(team(2, 2), league)).toBe(2)
    expect(gamesBehind(team(0, 4), league)).toBe(4)
  })

  it('gives half games when teams have played different numbers of games', () => {
    expect(gamesBehind(team(3, 1), [team(4, 1), team(3, 1)])).toBe(0.5)
  })

  it('is zero for every team tied for first', () => {
    expect(gamesBehind(team(3, 1), [team(3, 1), team(3, 1), team(1, 3)])).toBe(0)
  })

  it('treats a tie as neither a win nor a loss', () => {
    // 2-1-1 against a 3-1 leader: one fewer win, the same losses
    expect(gamesBehind(team(2, 1, 0, 1), [team(3, 1), team(2, 1, 0, 1)])).toBe(0.5)
  })

  it('is zero before anyone has played', () => {
    expect(gamesBehind(team(0, 0), [team(0, 0), team(0, 0)])).toBe(0)
  })
})

describe('leaguePointsPerGame', () => {
  it('divides every team’s points by every team’s games', () => {
    // 400 + 500 points over 4 + 4 games
    expect(leaguePointsPerGame([team(3, 1, 400), team(1, 3, 500)])).toBe(112.5)
  })

  it('counts tied games as games', () => {
    expect(leaguePointsPerGame([team(1, 0, 300, 1), team(0, 1, 100, 1)])).toBe(100)
  })

  it('is null before any game has been played', () => {
    expect(leaguePointsPerGame([team(0, 0), team(0, 0)])).toBeNull()
    expect(leaguePointsPerGame([])).toBeNull()
  })
})
