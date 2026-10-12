// Holds the page's data state: nothing linked, loading, failed, or every linked league's week.

import { useEffect, useState } from 'react'
import { describeEspnProblem } from '../platforms/espn/espnProblems.ts'
import { espn, nfl, platformFor, sleeper } from '../platforms/index.ts'
import type {
  EspnFindResult,
  InjuryStatuses,
  League,
  LeagueMember,
  LiveGames,
  Matchup,
  PlayerDirectory,
  PlayerPoints,
  SeasonRecord,
  User,
  WeekStats,
} from '../platforms/types.ts'
import { hasLinks, readLinks, saveLinks } from './links.ts'
import type { Links } from './links.ts'

export interface LeagueSummary {
  league: League
  // null when the league has no game for me this week
  matchup: Matchup | null
  myPlayers: PlayerPoints[]
  opponentPlayers: PlayerPoints[]
  // my season so far and the league's members, as of today whichever week is shown
  season: SeasonRecord | null
  members: LeagueMember[]
}

export type LeaguesState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'loaded'
      sleeperUser: User | null
      season: string
      // the real current week, and the week being shown
      currentWeek: number
      week: number
      // true while another week is being fetched; the old week stays on screen meanwhile
      changingWeek: boolean
      leagues: LeagueSummary[]
      // every player's real stat line for the week shown; empty if it couldn't be loaded
      stats: WeekStats
      // each player's injury designation as of today; empty if it couldn't be loaded
      injuries: InjuryStatuses
      // which NFL games are over or under way. Only filled in for the week in progress.
      games: LiveGames
      players: PlayerDirectory
      // things that went wrong without stopping the load, e.g. an ESPN league that turned private
      warnings: string[]
    }

function errorState(error: unknown): LeaguesState {
  return { status: 'error', message: error instanceof Error ? error.message : String(error) }
}

// Everything that depends on the week: each league's matchup and players, plus real stat lines
async function loadWeek(leagues: League[], season: string, week: number, currentWeek: number) {
  // Only the week in progress has games under way; any other week is projected as it stood.
  // The scoreboard only refines the projections, so a failure here shouldn't block the page.
  const games =
    week === currentWeek ? await nfl.getLiveGames(season, week).catch((): LiveGames => ({})) : undefined
  const [weeks, injuries, stats] = await Promise.all([
    Promise.all(leagues.map((league) => platformFor(league).getLeagueWeek(league, week, games))),
    nfl.getInjuryStatuses(season, week).catch((): InjuryStatuses => ({})),
    // Stats only feed the what-if calculator, so a failure here shouldn't block the page
    nfl.getWeekStats(season, week).catch((): WeekStats => ({})),
  ])
  return {
    leagues: leagues.map((league, i): LeagueSummary => ({ league, ...weeks[i] })),
    stats,
    injuries,
    games: games ?? {},
  }
}

interface LoadResult {
  // the links that actually worked, which is what gets remembered
  links: Links
  state: LeaguesState
}

// Loads everything for a set of links. Every change to the links goes through here.
async function loadLinks(wanted: Links): Promise<LoadResult> {
  if (!hasLinks(wanted)) return { links: wanted, state: { status: 'idle' } }
  try {
    const warnings: string[] = []
    const [now, players] = await Promise.all([nfl.getCurrentWeek(), nfl.getPlayerDirectory()])

    let sleeperUser: User | null = null
    let sleeperLeagues: League[] = []
    if (wanted.sleeperUsername) {
      sleeperUser = await sleeper.getUser(wanted.sleeperUsername)
      if (sleeperUser) {
        sleeperLeagues = await sleeper.getLeagues(sleeperUser.id, now.season)
      } else {
        warnings.push(`No Sleeper user named “${wanted.sleeperUsername}”.`)
      }
    }

    const espnResults = await Promise.all(
      wanted.espnLeagues.map((link) => espn.findLeague(link.leagueId, now.season)),
    )
    const espnLeagues: League[] = []
    wanted.espnLeagues.forEach((link, i) => {
      const result = espnResults[i]
      if (result.ok) {
        espnLeagues.push({ ...result.choice.league, myTeamId: link.teamId })
      } else {
        warnings.push(`ESPN league ${link.leagueId}: ${describeEspnProblem(result.problem)}`)
      }
    })

    return {
      links: {
        sleeperUsername: sleeperUser ? wanted.sleeperUsername : null,
        // A league that no longer exists is forgotten; a private one with a cookie problem is
        // kept, since fixing the cookies will bring it back
        espnLeagues: wanted.espnLeagues.filter((_, i) => {
          const result = espnResults[i]
          return result.ok || result.problem !== 'notFound'
        }),
      },
      state: {
        status: 'loaded',
        sleeperUser,
        season: now.season,
        currentWeek: now.week,
        week: now.week,
        changingWeek: false,
        ...(await loadWeek([...sleeperLeagues, ...espnLeagues], now.season, now.week, now.week)),
        players,
        warnings,
      },
    }
  } catch (error) {
    // A network failure says nothing about the links, so keep them
    return { links: wanted, state: errorState(error) }
  }
}

export function useLeagues() {
  const [links, setLinks] = useState<Links>(readLinks)
  // Start in "loading" if a previous visit left links behind, since the effect below loads them
  const [state, setState] = useState<LeaguesState>(() =>
    hasLinks(readLinks()) ? { status: 'loading' } : { status: 'idle' },
  )

  function apply(result: LoadResult) {
    setLinks(result.links)
    saveLinks(result.links)
    setState(result.state)
  }

  async function load(wanted: Links) {
    setState({ status: 'loading' })
    apply(await loadLinks(wanted))
  }

  // On the first render, load whatever was linked on a previous visit.
  // An empty dependency list means "run once, after the component first appears".
  useEffect(() => {
    const saved = readLinks()
    if (!hasLinks(saved)) return
    // In development React runs effects twice to expose bugs; this flag discards the first run
    let cancelled = false
    void loadLinks(saved).then((result) => {
      if (cancelled) return
      setLinks(result.links)
      saveLinks(result.links)
      setState(result.state)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function setSleeperUsername(username: string) {
    void load({ ...links, sleeperUsername: username })
  }

  function addEspnLeague(leagueId: string, teamId: string) {
    const others = links.espnLeagues.filter((link) => link.leagueId !== leagueId)
    void load({ ...links, espnLeagues: [...others, { leagueId, teamId }] })
  }

  function removeSleeper() {
    void load({ ...links, sleeperUsername: null })
  }

  function removeEspnLeague(leagueId: string) {
    const remaining = links.espnLeagues.filter((link) => link.leagueId !== leagueId)
    void load({ ...links, espnLeagues: remaining })
  }

  // The team picker needs a league's teams before anything is linked
  async function findEspnLeague(leagueId: string): Promise<EspnFindResult> {
    const now = await nfl.getCurrentWeek()
    return espn.findLeague(leagueId, now.season)
  }

  // Shows a different week for the leagues already loaded. Only the per-league data is refetched.
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
        ...(await loadWeek(leagues, loaded.season, week, loaded.currentWeek)),
      })
    } catch (error) {
      setState(errorState(error))
    }
  }

  return {
    state,
    links,
    setSleeperUsername,
    addEspnLeague,
    removeSleeper,
    removeEspnLeague,
    findEspnLeague,
    changeWeek,
  }
}
