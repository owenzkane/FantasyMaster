import { useState } from 'react'
import { describeEspnProblem } from '../platforms/espn/espnProblems.ts'
import type { EspnFindResult, EspnLeagueChoice } from '../platforms/types.ts'

interface Props {
  disabled: boolean
  onSleeperUsername: (username: string) => void
  findEspnLeague: (leagueId: string) => Promise<EspnFindResult>
  onAddEspnLeague: (leagueId: string, teamId: string) => void
}

// Yahoo is offered so the choice is visible, but nothing is built behind it yet
type Choice = 'sleeper' | 'espn' | 'yahoo'

const INPUT_LABELS: Record<Choice, string> = {
  sleeper: 'Sleeper username',
  espn: 'ESPN league ID',
  yahoo: 'Yahoo league',
}

// Accepts a bare ID ("1763533594") or anything containing "leagueId=1763533594", such as the
// league's web address
function parseLeagueId(text: string) {
  const fromUrl = text.match(/leagueId=(\d+)/i)
  if (fromUrl) return fromUrl[1]
  const trimmed = text.trim()
  return /^\d+$/.test(trimmed) ? trimmed : null
}

function LinkForm({ disabled, onSleeperUsername, findEspnLeague, onAddEspnLeague }: Props) {
  const [platform, setPlatform] = useState<Choice>('espn')
  const [text, setText] = useState('')
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // Set once an ESPN league is found; the form then asks which team is mine
  const [espnChoice, setEspnChoice] = useState<EspnLeagueChoice | null>(null)
  const [teamId, setTeamId] = useState('')

  async function findLeague() {
    const leagueId = parseLeagueId(text)
    if (!leagueId) {
      setMessage('Enter the league ID: the number after “leagueId=” in the league’s web address.')
      return
    }
    setSearching(true)
    try {
      const result = await findEspnLeague(leagueId)
      if (result.ok) {
        setEspnChoice(result.choice)
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

  // Second step for ESPN: pick my team in the league that was found
  if (espnChoice) {
    return (
      <form
        className="link-form"
        onSubmit={(event) => {
          event.preventDefault()
          onAddEspnLeague(espnChoice.league.id, teamId)
          setEspnChoice(null)
          setText('')
        }}
      >
        <label htmlFor="espn-team">Your team in {espnChoice.league.name}</label>
        <div className="link-form-row">
          <select
            id="espn-team"
            className="select"
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
          >
            {espnChoice.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.ownerName ? `${team.name} (${team.ownerName})` : team.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary" disabled={disabled || !teamId}>
            Add league
          </button>
          <button type="button" className="btn" onClick={() => setEspnChoice(null)}>
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
        // Stop the browser's default behaviour of reloading the page on submit
        event.preventDefault()
        setMessage(null)
        if (platform === 'sleeper') {
          const username = text.trim()
          if (username) {
            onSleeperUsername(username)
            setText('')
          }
        } else if (platform === 'espn') {
          void findLeague()
        }
      }}
    >
      <label htmlFor="link-input">{INPUT_LABELS[platform]}</label>
      <div className="link-form-row">
        <select
          className="select platform-select"
          aria-label="Platform"
          value={platform}
          onChange={(event) => {
            setPlatform(event.target.value as Choice)
            setText('')
            setMessage(null)
          }}
        >
          <option value="espn">ESPN</option>
          <option value="yahoo">Yahoo</option>
          <option value="sleeper">Sleeper</option>
        </select>
        <input
          id="link-input"
          className="input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={platform === 'yahoo'}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={disabled || searching || platform === 'yahoo'}
        >
          {platform === 'sleeper' ? 'Show leagues' : 'Find league'}
        </button>
      </div>
      {platform === 'yahoo' && <p className="status">Yahoo leagues aren’t supported yet.</p>}
      {message && (
        <p className="status" role="alert">
          {message}
        </p>
      )}
    </form>
  )
}

export default LinkForm
