// Holds the page's data state: nothing yet, loading, failed, or a user's leagues for the week.

import { useState } from 'react'
import { platform } from '../platforms/index.ts'
import type {
  League,
  Matchup,
  PlayerDirectory,
  PlayerPoints,
  User,
  WeekStats,
} from '../platforms/types.ts'

export interface LeagueSummary {
  league: League
  // null when the league has no game for me this week
  matchup: Matchup | null
  myPlayers: PlayerPoints[]
  opponentPlayers: PlayerPoints[]
}

export type LeaguesState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'notFound'; username: string }
  | { status: 'error'; message: string }
  | {
      status: 'loaded'
      user: User
      season: string
      // the real current week, and the week being shown
      currentWeek: number
      week: number
      // true while another week is being fetched; the old week stays on screen meanwhile
      changingWeek: boolean
      leagues: LeagueSummary[]
      // every player's real stat line for the week shown; empty if it couldn't be loaded
      stats: WeekStats
      players: PlayerDirectory
    }

function errorState(error: unknown): LeaguesState {
  return { status: 'error', message: error instanceof Error ? error.message : String(error) }
}

// Everything that depends on the week: each league's matchup and players, plus real stat lines
async function loadWeek(leagues: League[], userId: string, season: string, week: number) {
  const [weeks, stats] = await Promise.all([
    Promise.all(leagues.map((league) => platform.getLeagueWeek(league.id, userId, week))),
    // Stats only feed the what-if calculator, so a failure here shouldn't block the page
    platform.getWeekStats(season, week).catch((): WeekStats => ({})),
  ])
  return {
    leagues: leagues.map((league, i): LeagueSummary => ({ league, ...weeks[i] })),
    stats,
  }
}

export function useLeagues() {
  const [state, setState] = useState<LeaguesState>({ status: 'idle' })

  async function load(username: string) {
    setState({ status: 'loading' })
    try {
      const [user, now, players] = await Promise.all([
        platform.getUser(username),
        platform.getCurrentWeek(),
        platform.getPlayerDirectory(),
      ])
      if (!user) {
        setState({ status: 'notFound', username })
        return
      }

      const leagues = await platform.getLeagues(user.id, now.season)

      setState({
        status: 'loaded',
        user,
        season: now.season,
        currentWeek: now.week,
        week: now.week,
        changingWeek: false,
        ...(await loadWeek(leagues, user.id, now.season, now.week)),
        players,
      })
    } catch (error) {
      setState(errorState(error))
    }
  }

  // Shows a different week for the user already loaded. Only the per-league data is refetched.
  async function changeWeek(week: number) {
    if (state.status !== 'loaded') return
    const loaded = state
    setState({ ...loaded, changingWeek: true })
    try {
      const leagues = loaded.leagues.map((summary) => summary.league)
      setState({
        ...loaded,
        week,
        changingWeek: false,
        ...(await loadWeek(leagues, loaded.user.id, loaded.season, week)),
      })
    } catch (error) {
      setState(errorState(error))
    }
  }

  return { state, load, changeWeek }
}
