import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { MyPlayer } from '../players/combinePlayers.ts'
import PlayersTable from './PlayersTable.tsx'

const entry = (leagueName: string, isStarter: boolean) => ({
  leagueId: leagueName,
  leagueName,
  points: 10,
  projected: 12.5,
  isStarter,
})
const players: MyPlayer[] = [
  {
    playerId: '1',
    leagues: [entry('League A', true), entry('League B', false)],
  },
  { playerId: '2', leagues: [entry('League A', true)] },
  { playerId: '3', leagues: [entry('League A', false)] },
]
const directory = {
  '1': { name: 'Healthy Guy', position: 'WR', team: 'BUF' },
  '2': { name: 'Hurt Guy', position: 'RB', team: 'MIA' },
  '3': { name: 'Maybe Guy', position: 'TE', team: 'NYJ' },
}

// Draws the table as HTML, one string per player row
function rows(injuries: Record<string, string>) {
  const html = renderToStaticMarkup(
    <PlayersTable players={players} directory={directory} injuries={injuries} />,
  )
  return html.split('<tr>').slice(2)
}
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

describe('PlayersTable', () => {
  it('tags an injured-reserve player "IR" in the red style', () => {
    const [, hurt] = rows({ '2': 'IR' })
    expect(hurt).toMatch(/<span class="badge badge-danger injury injury-out">IR<\/span>/)
  })

  it('tags Out in red and Doubtful or Questionable in amber', () => {
    expect(rows({ '2': 'Out' })[1]).toContain(
      '<span class="badge badge-danger injury injury-out">Out</span>',
    )
    expect(rows({ '3': 'Doubtful' })[2]).toContain(
      '<span class="badge badge-warning injury injury-doubt">Doubtful</span>',
    )
    expect(rows({ '3': 'Questionable' })[2]).toContain('injury-doubt">Questionable<')
  })

  it('shows no tag for a healthy player', () => {
    const [healthy] = rows({ '2': 'IR' })
    expect(healthy).not.toContain('injury')
  })

  it('shows how many leagues he’s started in, and marks the leagues where he’s benched', () => {
    const [first] = rows({})
    expect(text(first)).toContain('2 starting 1')
    expect(text(first)).toContain('League B (bench)')
    expect(text(first)).not.toContain('League A (bench)')
  })
})
