import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { LeagueSummary } from '../hooks/useLeagues.ts'
import type { League } from '../platforms/types.ts'
import LeagueCard from './LeagueCard.tsx'
import type { WeekTiming } from './LeagueCard.tsx'

// Draws the card as HTML text, without a browser, and strips the tags
function cardText(
  timing: WeekTiming,
  scores: { mine: number; theirs: number; myProjected: number | null; theirProjected: number | null },
  names: { mine: string | null; theirs: string | null; theirDisplay: string | null } = {
    mine: 'My Team',
    theirs: 'Their Team',
    theirDisplay: 'them',
  },
) {
  const summary: LeagueSummary = {
    league: { id: 'L', platform: 'sleeper', name: 'Test League', teamCount: 10 } as League,
    matchup: {
      leagueId: 'L',
      week: 1,
      myPoints: scores.mine,
      myProjected: scores.myProjected,
      myTeamName: names.mine,
      opponent: {
        displayName: names.theirDisplay,
        teamName: names.theirs,
        points: scores.theirs,
        projected: scores.theirProjected,
      },
    },
    myPlayers: [],
    opponentPlayers: [],
    season: null,
    members: [],
  }
  const html = renderToStaticMarkup(<LeagueCard summary={summary} timing={timing} directory={{}} />)
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
}

describe('LeagueCard team names', () => {
  const scores = { mine: 1, theirs: 1, myProjected: null, theirProjected: null }

  it('shows my team and my opponent’s team by team name', () => {
    expect(cardText('past', scores)).toContain('My Team vs. Their Team')
  })

  it('leaves the opponent’s display name out when they have a team name', () => {
    expect(cardText('past', scores)).not.toContain('(them)')
    expect(cardText('past', scores)).not.toContain('them')
  })

  it('falls back to the display name when the opponent has no team name', () => {
    const names = { mine: 'My Team', theirs: null, theirDisplay: 'them' }
    expect(cardText('past', scores, names)).toContain('My Team vs. them')
  })

  it('says "Unknown opponent" when there is no name at all', () => {
    const names = { mine: 'My Team', theirs: null, theirDisplay: null }
    expect(cardText('past', scores, names)).toContain('vs. Unknown opponent')
  })

  it('says "You" when I haven’t named my team', () => {
    const names = { mine: null, theirs: 'Their Team', theirDisplay: 'them' }
    expect(cardText('past', scores, names)).toContain('You vs. Their Team')
  })
})

describe('LeagueCard result', () => {
  const played = { mine: 120, theirs: 100, myProjected: 90, theirProjected: 110 }

  it('judges a past week on real points', () => {
    expect(cardText('past', played)).toContain('Won')
    expect(cardText('past', { ...played, mine: 80 })).toContain('Lost')
  })

  it('judges the current week on projections, not on who is ahead right now', () => {
    // I'm ahead 120 to 100 but projected to lose 90 to 110
    expect(cardText('current', played)).toContain('Projected loss')
    expect(cardText('current', played)).not.toContain('Winning')
    expect(cardText('current', { ...played, myProjected: 130 })).toContain('Projected win')
    expect(cardText('current', { ...played, myProjected: 110 })).toContain('Projected tie')
  })

  it('falls back to who is ahead right now when the current week has no projections', () => {
    const noProjections = { ...played, myProjected: null, theirProjected: null }
    expect(cardText('current', noProjections)).toContain('Winning')
    expect(cardText('current', { ...noProjections, mine: 80 })).toContain('Losing')
    expect(cardText('current', { ...noProjections, mine: 100 })).toContain('Tied')
  })

  it('never uses projections for a past week', () => {
    expect(cardText('past', played)).not.toContain('Projected')
  })

  it('judges a future week on projections, since no points exist yet', () => {
    const future = { mine: 0, theirs: 0, myProjected: 121.4, theirProjected: 118.2 }
    expect(cardText('future', future)).toContain('Projected win')
    expect(cardText('future', { ...future, myProjected: 100 })).toContain('Projected loss')
  })

  it('gives a future week no result when there are no projections', () => {
    const text = cardText('future', { mine: 0, theirs: 0, myProjected: null, theirProjected: null })
    expect(text).not.toContain('Projected')
    expect(text).not.toContain('Tied')
  })

  it('shows each side’s projection next to its score', () => {
    const text = cardText('past', played)
    expect(text).toContain('120.00 proj 90.00')
    expect(text).toContain('100.00 proj 110.00')
  })
})
