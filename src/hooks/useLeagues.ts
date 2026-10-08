// Holds the page's data state: nothing yet, loading, failed, or a user's leagues with matchups.

import { useState } from 'react'
import { platform } from '../platforms/index.ts'
import type { League, Matchup, User } from '../platforms/types.ts'

export interface LeagueMatchup {
  league: League
  // null when the league has no game for me this week
  matchup: Matchup | null
}

export type LeaguesState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'notFound'; username: string }
  | { status: 'error'; message: string }
  | { status: 'loaded'; user: User; season: string; week: number; leagues: LeagueMatchup[] }

export function useLeagues() {
  const [state, setState] = useState<LeaguesState>({ status: 'idle' })

  async function load(username: string) {
    setState({ status: 'loading' })
    try {
      const [user, now] = await Promise.all([
        platform.getUser(username),
        platform.getCurrentWeek(),
      ])
      if (!user) {
        setState({ status: 'notFound', username })
        return
      }

      const leagues = await platform.getLeagues(user.id, now.season)
      const matchups = await Promise.all(
        leagues.map((league) => platform.getMatchup(league.id, user.id, now.week)),
      )

      setState({
        status: 'loaded',
        user,
        season: now.season,
        week: now.week,
        leagues: leagues.map((league, i) => ({ league, matchup: matchups[i] })),
      })
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { state, load }
}
