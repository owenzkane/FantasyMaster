// Turns Sleeper's injury wording into the short tag shown next to a player's name.

export interface InjuryTag {
  label: string
  // 'out' won't play (shown in red); 'doubt' might not (shown in amber)
  severity: 'out' | 'doubt'
}

const TAGS: Record<string, InjuryTag> = {
  IR: { label: 'IR', severity: 'out' },
  Out: { label: 'Out', severity: 'out' },
  PUP: { label: 'PUP', severity: 'out' },
  Sus: { label: 'Suspended', severity: 'out' },
  Doubtful: { label: 'Doubtful', severity: 'doubt' },
  Questionable: { label: 'Questionable', severity: 'doubt' },
}

// null for a healthy player, and for the few statuses that aren't about playing this week
export function injuryTag(status: string | undefined): InjuryTag | null {
  return (status && TAGS[status]) || null
}
