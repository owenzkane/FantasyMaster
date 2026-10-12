import { describe, expect, it } from 'vitest'
import { searchPlayers } from './searchPlayers.ts'

const directory = {
  '1': { name: 'A.J. Brown', position: 'WR', team: 'PHI' },
  '2': { name: 'Amon-Ra St. Brown', position: 'WR', team: 'DET' },
  '3': { name: 'Trevor Lawrence', position: 'QB', team: 'JAX' },
  '4': { name: 'Brian Thomas', position: 'WR', team: 'JAX' },
}
// already in the order the list should keep: most leagues first
const players = ['3', '2', '1', '4', '99'].map((playerId, i) => ({ playerId, leagueCount: 5 - i }))
const find = (query: string, limit?: number) =>
  searchPlayers(query, players, directory, limit).map((player) => player.playerId)

describe('searchPlayers', () => {
  it('matches part of a name, whatever the capitals', () => {
    expect(find('lawr')).toEqual(['3'])
    expect(find('TREVOR')).toEqual(['3'])
  })

  it('ignores punctuation in the name and in what’s typed', () => {
    expect(find('aj brown')).toEqual(['1'])
    expect(find('a.j.')).toEqual(['1'])
    expect(find('amon ra')).toEqual(['2'])
  })

  it('needs every word typed to appear, in any order', () => {
    expect(find('brown')).toEqual(['2', '1'])
    expect(find('brown st')).toEqual(['2'])
    expect(find('brown lawrence')).toEqual([])
  })

  it('keeps the order it was given, most leagues first', () => {
    // "br" is in Brown, Brown and Brian
    expect(find('br')).toEqual(['2', '1', '4'])
  })

  it('stops at the limit', () => {
    expect(find('br', 2)).toEqual(['2', '1'])
  })

  it('matches nobody for an empty search', () => {
    expect(find('')).toEqual([])
    expect(find('   ')).toEqual([])
  })

  it('never matches a player the directory doesn’t know', () => {
    expect(find('99')).toEqual([])
  })
})
