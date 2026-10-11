// ESPN's implementation of FantasyPlatform: fetch raw JSON, convert it to our types.

import { fetchPlayerDirectory } from '../sleeper/sleeperApi.ts'
import type {
  EspnLeagueChoice,
  EspnSource,
  League,
  LeagueWeek,
  PlayerDirectory,
  PlayerPoints,
} from '../types.ts'
import { fetchEspnLeague, fetchEspnWeek } from './espnApi.ts'
import { toSleeperPlayerId } from './espnPlayers.ts'
import { toScoring } from './espnStats.ts'
import type { EspnLeagueResponse, EspnMatchupSide } from './espnTypes.ts'

const RECEPTIONS_STAT_ID = 53
const BENCH_SLOTS = [20, 21]
// Lineup slots in the order a lineup is usually read: QB, RB, WR, TE, FLEX, D/ST, K
const SLOT_ORDER = [0, 2, 4, 6, 23, 16, 17]

export function toEspnLeagueChoice(response: EspnLeagueResponse): EspnLeagueChoice | null {
  const { settings, teams, members } = response
  if (!settings || !teams) return null

  const items = settings.scoringSettings.scoringItems
  const perReception = items.find((item) => item.statId === RECEPTIONS_STAT_ID)
  const { scoring, gaps } = toScoring(items)
  return {
    league: {
      id: String(response.id),
      platform: 'espn',
      name: settings.name,
      season: String(response.seasonId),
      teamCount: settings.size,
      pointsPerReception: perReception?.points ?? 0,
      scoring,
      scoringGaps: gaps,
    },
    teams: teams.map((team) => ({
      id: String(team.id),
      name: team.name,
      ownerName: members?.find((member) => member.id === team.primaryOwner)?.displayName ?? null,
    })),
  }
}

// ESPN sends points with floating-point noise, like 18.520000000000003
function round2(value: number) {
  return Math.round(value * 100) / 100
}

function slotRank(slotId: number) {
  const rank = SLOT_ORDER.indexOf(slotId)
  return rank === -1 ? SLOT_ORDER.length : rank
}

// One team's players for the week: starters first in lineup order, then the bench.
function toPlayers(side: EspnMatchupSide, directory: PlayerDirectory): PlayerPoints[] {
  const entries = side.rosterForCurrentScoringPeriod?.entries ?? []
  const isStarter = (slotId: number) => !BENCH_SLOTS.includes(slotId)
  return entries
    .map((entry) => ({
      slotId: entry.lineupSlotId,
      player: {
        playerId: toSleeperPlayerId(entry.playerPoolEntry.player, directory),
        points: round2(entry.playerPoolEntry.appliedStatTotal),
        isStarter: isStarter(entry.lineupSlotId),
      },
    }))
    .sort(
      (a, b) =>
        Number(b.player.isStarter) - Number(a.player.isStarter) ||
        slotRank(a.slotId) - slotRank(b.slotId),
    )
    .map((entry) => entry.player)
}

// The roster total stays current during games; totalPoints is the fallback
function pointsOf(side: EspnMatchupSide) {
  return round2(side.rosterForCurrentScoringPeriod?.appliedStatTotal ?? side.totalPoints)
}

// Works out my matchup and both teams' players from one week's ESPN response.
export function toEspnLeagueWeek(
  league: League,
  week: number,
  response: EspnLeagueResponse,
  directory: PlayerDirectory,
): LeagueWeek {
  const myTeamId = Number(league.myTeamId)
  const game = response.schedule?.find(
    (matchup) =>
      matchup.matchupPeriodId === week &&
      (matchup.home.teamId === myTeamId || matchup.away?.teamId === myTeamId),
  )
  if (!game) return { matchup: null, myPlayers: [], opponentPlayers: [] }

  const mine = game.home.teamId === myTeamId ? game.home : game.away!
  const theirs = game.home.teamId === myTeamId ? game.away : game.home

  const opponentTeam = response.teams?.find((team) => team.id === theirs?.teamId)
  const opponentOwner = response.members?.find((member) => member.id === opponentTeam?.primaryOwner)

  return {
    matchup: {
      leagueId: league.id,
      week,
      myPoints: pointsOf(mine),
      opponent: theirs
        ? {
            displayName: opponentOwner?.displayName ?? null,
            teamName: opponentTeam?.name ?? null,
            points: pointsOf(theirs),
          }
        : null,
    },
    myPlayers: toPlayers(mine, directory),
    opponentPlayers: theirs ? toPlayers(theirs, directory) : [],
  }
}

export const espnPlatform: EspnSource = {
  async findLeague(leagueId, season) {
    const response = await fetchEspnLeague(leagueId, season)
    if (typeof response === 'string') return { ok: false, problem: response }
    const choice = toEspnLeagueChoice(response)
    return choice ? { ok: true, choice } : { ok: false, problem: 'notFound' }
  },

  async getLeagueWeek(league, week) {
    const [response, directory] = await Promise.all([
      fetchEspnWeek(league.id, league.season, week),
      fetchPlayerDirectory(),
    ])
    return toEspnLeagueWeek(league, week, response, directory)
  },
}
