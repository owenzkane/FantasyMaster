import { beforeAll, describe, expect, it } from 'vitest'
import type { LeagueSummary } from '../hooks/useLeagues.ts'
import { loadDemo, loadEveryTeam } from '../testing/demo.ts'
import { applyLine, keptPoints, pointsFor, statInputs } from './statLine.ts'

const round2 = (value: number) => Math.round(value * 100) / 100

describe('pointsFor', () => {
  it('multiplies each stat by the league’s value for it and adds them up', () => {
    const scoring = { rec: 1, rec_yd: 0.1, rec_td: 6 }
    // 6 catches + 8.0 for the yards + one touchdown
    expect(pointsFor({ rec: 6, rec_yd: 80, rec_td: 1 }, scoring)).toBe(20)
  })

  it('ignores stats the league doesn’t score', () => {
    expect(pointsFor({ rec: 6, rec_tgt: 9, off_snp: 60 }, { rec: 0.5 })).toBe(3)
  })

  it('handles negative scoring', () => {
    expect(pointsFor({ pass_int: 2, pass_td: 1 }, { pass_int: -2, pass_td: 4 })).toBe(0)
  })
})

describe('statInputs', () => {
  it('offers passing first for quarterbacks and receiving first for receivers', () => {
    expect(statInputs('QB')?.[0].key).toBe('pass_yd')
    expect(statInputs('RB')?.[0].key).toBe('rush_yd')
    expect(statInputs('WR')?.[0].key).toBe('rec')
    expect(statInputs('TE')?.[0].key).toBe('rec')
  })

  it('offers nothing for kickers, defenses and unknown positions', () => {
    expect(statInputs('K')).toBeNull()
    expect(statInputs('DEF')).toBeNull()
    expect(statInputs(null)).toBeNull()
  })
})

describe('applyLine', () => {
  it('lays the typed line over his real stats, keeping what it doesn’t mention', () => {
    const stats = applyLine({ rec: 2, rec_yd: 19, rec_fd: 1 }, { rec: 8, rec_yd: 95 }, 'WR')
    expect(stats).toMatchObject({ rec: 8, rec_yd: 95, rec_fd: 1 })
  })

  it('awards only the highest yardage bonus reached', () => {
    const bonuses = (rec_yd: number) => {
      const stats = applyLine({}, { rec_yd }, 'WR')
      return [stats.bonus_rec_yd_100, stats.bonus_rec_yd_200]
    }
    expect(bonuses(99)).toEqual([0, 0])
    expect(bonuses(100)).toEqual([1, 0])
    expect(bonuses(199)).toEqual([1, 0])
    // Seen in real data: a 213-yard game had the 200 bonus and not the 100 one
    expect(bonuses(213)).toEqual([0, 1])
  })

  it('adds rushing and receiving yards for the combined bonus', () => {
    const stats = applyLine({}, { rush_yd: 60, rec_yd: 45 }, 'RB')
    expect(stats.bonus_rush_rec_yd_100).toBe(1)
    expect(stats.bonus_rush_yd_100).toBe(0)
  })

  it('clears a bonus his real game earned when the typed line falls short', () => {
    const stats = applyLine({ pass_yd: 320, bonus_pass_yd_300: 1 }, { pass_yd: 250 }, 'QB')
    expect(stats.bonus_pass_yd_300).toBe(0)
  })

  it('sets the per-catch bonus for his own position only', () => {
    expect(applyLine({}, { rec: 7 }, 'TE')).toMatchObject({ bonus_rec_te: 7 })
    expect(applyLine({}, { rec: 7 }, 'TE').bonus_rec_wr).toBeUndefined()
  })
})

describe('the scoring formula against real scores in the fixtures (week 4)', () => {
  let demo: Awaited<ReturnType<typeof loadDemo>>
  // every team in the six real Sleeper leagues, and in the ESPN league
  let sleeperTeams: LeagueSummary[]
  let espnTeams: LeagueSummary[]
  beforeAll(async () => {
    demo = await loadDemo()
    const real = demo.sleeper.slice(0, 6)
    sleeperTeams = (await Promise.all(real.map((summary) => loadEveryTeam(summary, 4)))).flat()
    espnTeams = await loadEveryTeam(demo.espn, 4)
  })

  // For each player on each team: [name, points the platform reported, points we calculate]
  const compare = (teams: LeagueSummary[], calculate: (playerId: string, team: LeagueSummary) => number | null) =>
    teams.flatMap((team) =>
      team.myPlayers.flatMap((player) => {
        const calculated = calculate(player.playerId, team)
        if (calculated === null || player.points === null) return []
        return [[demo.directory[player.playerId]?.name, player.points, round2(calculated)]]
      }),
    )

  it('reproduces all 1,221 player scores Sleeper reported, at every position', () => {
    const results = compare(sleeperTeams, (playerId, team) =>
      pointsFor(demo.stats[playerId] ?? {}, team.league.scoring!),
    )
    expect(results).toHaveLength(1221)
    expect(results.filter(([, reported, calculated]) => reported !== calculated)).toEqual([])
  })

  // Laying a player's own line over his own stats should change nothing
  const ownLine = (playerId: string, team: LeagueSummary) => {
    const position = demo.directory[playerId]?.position ?? null
    const inputs = statInputs(position)
    if (!inputs) return null
    const actual = demo.stats[playerId] ?? {}
    const line = Object.fromEntries(inputs.map((input) => [input.key, actual[input.key] ?? 0]))
    return pointsFor(applyLine(actual, line, position), team.league.scoring!)
  }

  it('gives the same score when a player’s own line is typed back in (Sleeper)', () => {
    const results = compare(sleeperTeams, ownLine)
    expect(results.length).toBeGreaterThan(900)
    expect(results.filter(([, reported, calculated]) => reported !== calculated)).toEqual([])
  })

  it('reproduces ESPN’s scores from Sleeper’s stats and the translated ESPN rules', () => {
    const results = compare(espnTeams, ownLine)
    expect(results).toHaveLength(98)
    expect(results.filter(([, reported, calculated]) => reported !== calculated)).toEqual([])
  })

  it('scores Trevor Lawrence’s real line differently in each league', () => {
    const lawrence = demo.playerId('Trevor Lawrence')
    const points = (name: string, changes = {}) =>
      round2(
        pointsFor(
          applyLine(demo.stats[lawrence], changes, 'QB'),
          demo.league(name).league.scoring!,
        ),
      )
    expect(demo.stats[lawrence]).toMatchObject({ pass_yd: 227, pass_td: 1, pass_cmp: 18 })
    expect([points('Demo League 2'), points('Demo League 4'), points('Demo League 5')]).toEqual([
      13.08, 15.08, 24.08,
    ])
    // A hypothetical 310 yards and 3 touchdowns
    const big = { pass_yd: 310, pass_td: 3 }
    expect([
      points('Demo League 2', big),
      points('Demo League 4', big),
      points('Demo League 5', big),
    ]).toEqual([24.4, 30.4, 39.4])
  })

  it('reports the points a typed line can’t control as "kept"', () => {
    const lawrence = demo.playerId('Trevor Lawrence')
    const kept = (name: string) =>
      round2(keptPoints(demo.stats[lawrence], statInputs('QB')!, 'QB', demo.league(name).league.scoring!))
    // Demo League 5 gives half a point per completion, and he had 18
    expect(kept('Demo League 5')).toBe(9)
    expect(kept('Demo League 2')).toBe(0)
  })
})
