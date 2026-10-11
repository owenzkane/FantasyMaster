// Which NFL games have started or finished, from ESPN's public scoreboard.
// Unofficial and undocumented, like ESPN's fantasy API, but it allows calls from a browser.

import type { GameStatus, LiveGames } from '../types.ts'

const SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'

// The scoreboard's team abbreviations where they differ from Sleeper's, which the app uses
const TEAM_ALIASES: Record<string, string> = { WSH: 'WAS' }

const REGULATION_MINUTES = 60
const QUARTER_SECONDS = 15 * 60

export interface ScoreboardResponse {
  week?: { number: number }
  events: {
    status: {
      // which quarter (5 and up is overtime), and the seconds left in it
      period: number
      clock: number
      type: { state: string }
    }
    competitions: { competitors: { team: { abbreviation: string } }[] }[]
  }[]
}

// How much of a game is left, as a fraction of regulation time
function fractionRemaining(state: string, period: number, clock: number) {
  if (state === 'pre') return 1
  if (state === 'post') return 0
  // Overtime has no fixed length, so a game in it counts as nearly over
  if (period > 4) return 0
  return ((4 - period) * QUARTER_SECONDS + clock) / (REGULATION_MINUTES * 60)
}

// The scoreboard only ever shows one week at a time, so it's checked against the week we want
export function toLiveGames(response: ScoreboardResponse, week: number): LiveGames {
  if (response.week?.number !== week) return {}

  const games: LiveGames = {}
  for (const { status, competitions } of response.events) {
    const state: GameStatus['state'] =
      status.type.state === 'in' ? 'in' : status.type.state === 'post' ? 'post' : 'pre'
    const game: GameStatus = {
      state,
      fractionRemaining: fractionRemaining(state, status.period, status.clock),
    }
    for (const { team } of competitions[0].competitors) {
      games[TEAM_ALIASES[team.abbreviation] ?? team.abbreviation] = game
    }
  }
  return games
}

export async function fetchLiveGames(week: number): Promise<LiveGames> {
  const response = await fetch(SCOREBOARD_URL)
  if (!response.ok) throw new Error(`NFL scoreboard request failed (${response.status})`)
  return toLiveGames((await response.json()) as ScoreboardResponse, week)
}
