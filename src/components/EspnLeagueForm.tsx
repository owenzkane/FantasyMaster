import { useState } from 'react'
import { describeEspnProblem } from '../platforms/espn/espnProblems.ts'
import type { EspnFindResult, EspnLeagueChoice } from '../platforms/types.ts'

interface Props {
  disabled: boolean
  findLeague: (leagueId: string) => Promise<EspnFindResult>
  onAdd: (leagueId: string, teamId: string) => void
}

// Accepts a bare ID ("1763533594") or anything containing "leagueId=1763533594", such as the
// league's web address
function parseLeagueId(text: string) {
  const fromUrl = text.match(/leagueId=(\d+)/i)
  if (fromUrl) return fromUrl[1]
  const trimmed = text.trim()
  return /^\d+$/.test(trimmed) ? trimmed : null
}

function EspnLeagueForm({ disabled, findLeague, onAdd }: Props) {
  const [text, setText] = useState('')
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // Set once a league is found; the form then asks which team is mine
  const [choice, setChoice] = useState<EspnLeagueChoice | null>(null)
  const [teamId, setTeamId] = useState('')

  async function find() {
    const leagueId = parseLeagueId(text)
    if (!leagueId) {
      setMessage('Enter the league ID: the number after “leagueId=” in the league’s web address.')
      return
    }
    setSearching(true)
    setMessage(null)
    try {
      const result = await findLeague(leagueId)
      if (result.ok) {
        setChoice(result.choice)
        setTeamId(result.choice.teams[0]?.id ?? '')
      } else {
        setMessage(describeEspnProblem(result.problem))
      }
    } catch (error) {
      setMessage(`Couldn’t reach ESPN. ${error instanceof Error ? error.message : ''}`)
    } finally {
      setSearching(false)
    }
  }

  if (choice) {
    return (
      <form
        className="link-form"
        onSubmit={(event) => {
          event.preventDefault()
          onAdd(choice.league.id, teamId)
          setChoice(null)
          setText('')
        }}
      >
        <label htmlFor="espn-team">Your team in {choice.league.name}</label>
        <div className="link-form-row">
          <select id="espn-team" value={teamId} onChange={(event) => setTeamId(event.target.value)}>
            {choice.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.ownerName ? `${team.name} (${team.ownerName})` : team.name}
              </option>
            ))}
          </select>
          <button type="submit" disabled={disabled || !teamId}>
            Add league
          </button>
          <button type="button" className="secondary" onClick={() => setChoice(null)}>
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <form
      className="link-form"
      onSubmit={(event) => {
        event.preventDefault()
        void find()
      }}
    >
      <label htmlFor="espn-league">ESPN league ID</label>
      <div className="link-form-row">
        <input
          id="espn-league"
          value={text}
          onChange={(event) => setText(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" disabled={disabled || searching}>
          Find league
        </button>
      </div>
      {message && (
        <p className="status" role="alert">
          {message}
        </p>
      )}
    </form>
  )
}

export default EspnLeagueForm
