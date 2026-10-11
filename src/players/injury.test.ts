import { describe, expect, it } from 'vitest'
import { injuryTag } from './injury.ts'

describe('injuryTag', () => {
  it('marks players who won’t play as "out"', () => {
    expect(injuryTag('IR')).toEqual({ label: 'IR', severity: 'out' })
    expect(injuryTag('Out')).toEqual({ label: 'Out', severity: 'out' })
    expect(injuryTag('PUP')).toEqual({ label: 'PUP', severity: 'out' })
    expect(injuryTag('Sus')).toEqual({ label: 'Suspended', severity: 'out' })
  })

  it('marks players who might not play as "doubt"', () => {
    expect(injuryTag('Doubtful')).toEqual({ label: 'Doubtful', severity: 'doubt' })
    expect(injuryTag('Questionable')).toEqual({ label: 'Questionable', severity: 'doubt' })
  })

  it('gives no tag to a healthy player or an unrecognised status', () => {
    expect(injuryTag(undefined)).toBeNull()
    expect(injuryTag('')).toBeNull()
    expect(injuryTag('NA')).toBeNull()
  })
})
