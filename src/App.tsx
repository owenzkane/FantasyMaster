import { useState } from 'react'
import LeagueList from './components/LeagueList.tsx'
import PlayersTable from './components/PlayersTable.tsx'
import UsernameForm from './components/UsernameForm.tsx'
import WeekPicker from './components/WeekPicker.tsx'
import { useLeagues } from './hooks/useLeagues.ts'
import { usingMock } from './platforms/index.ts'
import { combinePlayers } from './players/combinePlayers.ts'
import './App.css'

type View = 'leagues' | 'players'

// The NFL regular season is 18 weeks
const LAST_WEEK = 18

function App() {
  const { state, load, changeWeek } = useLeagues()
  const [view, setView] = useState<View>('leagues')
  const busy = state.status === 'loading' || (state.status === 'loaded' && state.changingWeek)

  return (
    <main>
      <h1>FantasyMaster</h1>
      {usingMock && (
        <p className="mock-note">
          Mock data is on. Use the username <code>demo_user</code>.
        </p>
      )}

      <UsernameForm disabled={busy} onSubmit={load} />

      {state.status === 'loading' && <p className="status">Loading leagues…</p>}

      {state.status === 'notFound' && (
        <p className="status" role="alert">
          No Sleeper user named “{state.username}”.
        </p>
      )}

      {state.status === 'error' && (
        <p className="status" role="alert">
          Couldn’t load leagues. {state.message}
        </p>
      )}

      {state.status === 'loaded' && (
        <section>
          <div className="results-header">
            <h2>
              {state.user.displayName} · {state.season}
              {usingMock && ` week ${state.week}`}
            </h2>
            {/* The mock always shows its one saved week, so it gets no picker */}
            {!usingMock && state.leagues.length > 0 && (
              <WeekPicker
                week={state.week}
                currentWeek={state.currentWeek}
                lastWeek={LAST_WEEK}
                disabled={state.changingWeek}
                onChange={changeWeek}
              />
            )}
          </div>
          {state.leagues.length === 0 ? (
            <p className="status">No leagues found for the {state.season} season.</p>
          ) : (
            <div className={state.changingWeek ? 'results changing' : 'results'}>
              <div className="view-switch">
                <button
                  type="button"
                  aria-pressed={view === 'leagues'}
                  onClick={() => setView('leagues')}
                >
                  Leagues
                </button>
                <button
                  type="button"
                  aria-pressed={view === 'players'}
                  onClick={() => setView('players')}
                >
                  My players
                </button>
              </div>
              {view === 'leagues' ? (
                <LeagueList
                  leagues={state.leagues}
                  timing={
                    state.week < state.currentWeek
                      ? 'past'
                      : state.week > state.currentWeek
                        ? 'future'
                        : 'current'
                  }
                  directory={state.players}
                />
              ) : (
                <PlayersTable players={combinePlayers(state.leagues)} directory={state.players} />
              )}
            </div>
          )}
        </section>
      )}
    </main>
  )
}

export default App
