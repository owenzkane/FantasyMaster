import { describe, expect, it } from 'vitest'
import { toWeekOutlook } from './sleeperApi.ts'

describe('toWeekOutlook', () => {
  it('splits Sleeper’s list into projected stat lines and injury statuses', () => {
    const outlook = toWeekOutlook([
      { player_id: '1', stats: { rec: 5.2, rec_yd: 61.4 }, player: { injury_status: null } },
      { player_id: '2', stats: {}, player: { injury_status: 'IR' } },
      { player_id: '3', stats: { rush_yd: 40 }, player: { injury_status: 'Questionable' } },
    ])
    expect(outlook.projections).toEqual({
      '1': { rec: 5.2, rec_yd: 61.4 },
      '2': {},
      '3': { rush_yd: 40 },
    })
    expect(outlook.injuries).toEqual({ '2': 'IR', '3': 'Questionable' })
  })

  it('leaves healthy players, and entries with no player details, out of the injuries', () => {
    const outlook = toWeekOutlook([
      { player_id: '1', stats: {}, player: { injury_status: '' } },
      { player_id: '2', stats: {} },
    ])
    expect(outlook.injuries).toEqual({})
  })
})
