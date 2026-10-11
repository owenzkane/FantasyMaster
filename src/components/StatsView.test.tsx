import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadDemo } from '../testing/demo.ts'
import StatsView from './StatsView.tsx'

// The "Season so far" table from the mock data, one array of cell texts per row
let rows: string[][]
beforeAll(async () => {
  const demo = await loadDemo()
  const html = renderToStaticMarkup(<StatsView leagues={demo.all} directory={demo.directory} />)
  const table = html.split('</table>')[0]
  rows = table
    .split('<tr>')
    .slice(1)
    .map((row) => [...row.matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/g)].map((cell) => cell[1].replace(/<[^>]+>/g, '').trim()))
})

describe('StatsView season table', () => {
  it('has a column for each figure', () => {
    expect(rows[0]).toEqual([
      'League',
      'Record',
      'Win %',
      'Games behind',
      'Points per game',
      'League average',
    ])
  })

  it('shows a league’s record, win percentage, games behind, scoring and league average', () => {
    expect(rows[1]).toEqual(['Demo League 1', '0–4', '0.0%', '3', '122.03', '134.38'])
    expect(rows[3]).toEqual(['Demo League 3', '3–1', '75.0%', '1', '112.10', '113.78'])
  })

  it('shows dashes for a league that hasn’t played', () => {
    expect(rows[8]).toEqual(['Demo League 8 (not drafted)', '0–0', '—', '—', '—', '—'])
  })

  it('totals every league, with no games-behind figure', () => {
    expect(rows.at(-1)).toEqual(['All leagues', '13–19', '40.6%', '—', '118.26', '124.29'])
  })
})
