import { useEffect, useState } from 'react'
import { describeEspnProblem, needsEspnLogin } from '../platforms/espn/espnProblems.ts'
import type {
  EspnAccount,
  EspnConnection,
  EspnFindResult,
  EspnLeagueChoice,
} from '../platforms/types.ts'
import EspnConnect from './EspnConnect.tsx'

interface Props {
  disabled: boolean
  onSleeperUsername: (username: string) => void
  findEspnLeague: (leagueId: string) => Promise<EspnFindResult>
  onAddEspnLeague: (leagueId: string, teamId: string) => void
  espnAccount: EspnAccount
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

function LinkForm({
  disabled,
  onSleeperUsername,
  findEspnLeague,
  onAddEspnLeague,
  espnAccount,
}: Props) {
  const [platform, setPlatform] = useState<Choice>('espn')
  const [text, setText] = useState('')
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // Set once an ESPN league is found; the form then asks which team is mine
  const [espnChoice, setEspnChoice] = useState<EspnLeagueChoice | null>(null)
  const [teamId, setTeamId] = useState('')
  // Whether the "connect your ESPN account" instructions are showing
  const [connectOpen, setConnectOpen] = useState(false)
  // Whether this browser has an ESPN login stored; null until the server has answered.
  // The page can't read the login cookie itself, so it asks once when the form appears.
  const [connection, setConnection] = useState<EspnConnection | null>(null)
  useEffect(() => {
    let cancelled = false
    void espnAccount.status().then((status) => {
      if (!cancelled) setConnection(status)
    })
    return () => {
      cancelled = true
    }
  }, [espnAccount])

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
        // A private league opens the connect instructions straight away
        if (needsEspnLogin(result.problem)) setConnectOpen(true)
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
    <>
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
      {platform === 'espn' && (
        <EspnConnect
          account={espnAccount}
          connection={connection}
          onConnectionChange={setConnection}
          open={connectOpen}
          onOpen={() => setConnectOpen(true)}
          onClose={() => setConnectOpen(false)}
          onConnected={() => {
            setConnectOpen(false)
            setMessage(null)
            // Try the league that needed the login again
            if (parseLeagueId(text)) void findLeague()
          }}
        />
      )}
    </>
  )
}

export default LinkForm
