// For one player, works out what he needs to score in each league for me to win there.
// Every other player's score is held at its current value.

import type { League, Matchup, PlayerPoints } from '../platforms/types.ts'

interface LeagueWeekData {
  league: League
  matchup: Matchup | null
  myPlayers: PlayerPoints[]
  opponentPlayers: PlayerPoints[]
}

export type ScenarioRole = 'myStarter' | 'opponentStarter' | 'myBench' | 'opponentBench'

export interface LeagueScenario {
  league: League
  role: ScenarioRole
  // his points in this league's scoring right now
  currentPoints: number
  // I win if he scores more than this (my starter) or fewer than this (opponent's starter).
  // null for bench players: their points don't count, so nothing he does changes the result.
  threshold: number | null
  // how the matchup stands with his current points
  standing: 'winning' | 'losing' | 'tied'
}

// Fantasy points have two decimals; rounding hides floating-point noise like 14.200000000000003
function round2(value: number) {
  return Math.round(value * 100) / 100
}

export function winScenarios(playerId: string, leagues: LeagueWeekData[]): LeagueScenario[] {
  const scenarios: LeagueScenario[] = []

  for (const { league, matchup, myPlayers, opponentPlayers } of leagues) {
    // Without an opponent there is nothing to win or lose
    if (!matchup?.opponent) continue

    const mine = myPlayers.find((player) => player.playerId === playerId)
    const theirs = opponentPlayers.find((player) => player.playerId === playerId)
    const player = mine ?? theirs
    if (!player) continue

    const myPoints = matchup.myPoints
    const opponentPoints = matchup.opponent.points
    const currentPoints = player.points ?? 0

    let role: ScenarioRole
    let threshold: number | null = null
    if (mine) {
      role = mine.isStarter ? 'myStarter' : 'myBench'
      // Take his points out of my total; he has to cover whatever gap is left
      if (mine.isStarter) threshold = round2(opponentPoints - (myPoints - currentPoints))
    } else {
      role = player.isStarter ? 'opponentStarter' : 'opponentBench'
      // Take his points out of their total; he has to stay under my lead
      if (player.isStarter) threshold = round2(myPoints - (opponentPoints - currentPoints))
    }

    scenarios.push({
      league,
      role,
      currentPoints,
      threshold,
      standing:
        myPoints > opponentPoints ? 'winning' : myPoints < opponentPoints ? 'losing' : 'tied',
    })
  }

  return scenarios
}

export interface ScenarioPlayer {
  playerId: string
  // leagues where he starts for me or for my opponent
  leagueCount: number
}

// Every player starting in one of my matchups, most leagues first.
export function scenarioPlayers(leagues: LeagueWeekData[]): ScenarioPlayer[] {
  const counts = new Map<string, number>()
  for (const { matchup, myPlayers, opponentPlayers } of leagues) {
    if (!matchup?.opponent) continue
    for (const player of [...myPlayers, ...opponentPlayers]) {
      if (player.isStarter) counts.set(player.playerId, (counts.get(player.playerId) ?? 0) + 1)
    }
  }
  return [...counts]
    .map(([playerId, leagueCount]) => ({ playerId, leagueCount }))
    .sort((a, b) => b.leagueCount - a.leagueCount)
}

// A short name for a league's reception scoring, the rule people most often mean by "format"
export function scoringFormat(league: League) {
  const perReception = league.scoring.rec ?? 0
  if (perReception === 1) return 'PPR'
  if (perReception === 0.5) return 'Half PPR'
  if (perReception === 0) return 'Standard'
  return `${perReception} per reception`
}
