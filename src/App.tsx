import { useState } from 'react'
import LeagueList from './components/LeagueList.tsx'
import LinkedAccounts from './components/LinkedAccounts.tsx'
import LinkForm from './components/LinkForm.tsx'
import PlayersTable from './components/PlayersTable.tsx'
import StatsView from './components/StatsView.tsx'
import WinScenarios from './components/WinScenarios.tsx'
import WeekPicker from './components/WeekPicker.tsx'
import { hasLinks } from './hooks/links.ts'
import { useLeagues } from './hooks/useLeagues.ts'
import { usingMock } from './platforms/index.ts'
import { combinePlayers } from './players/combinePlayers.ts'
import type { WeekTiming } from './scenarios/gameStatus.ts'
import './App.css'

type View = 'leagues' | 'players' | 'scenarios' | 'stats'

// The NFL regular season is 18 weeks
const LAST_WEEK = 18

// Whether the week on screen is before, the same as, or after the real current week
function timingOf(week: number, currentWeek: number): WeekTiming {
  return week < currentWeek ? 'past' : week > currentWeek ? 'future' : 'current'
}

function App() {
  const {
    state,
    links,
    setSleeperUsername,
    addEspnLeague,
    removeSleeper,
    removeEspnLeague,
    findEspnLeague,
    changeWeek,
  } = useLeagues()
  const [view, setView] = useState<View>('leagues')
  const busy = state.status === 'loading' || (state.status === 'loaded' && state.changingWeek)

  return (
    <main>
      <h1>FantasyMaster</h1>
      {usingMock && (
        <p className="mock-note">
          Mock data is on. Use the Sleeper username <code>demo_user</code> and the ESPN league
          ID <code>1000000001</code>.
        </p>
      )}

      <LinkForm
        disabled={busy}
        onSleeperUsername={setSleeperUsername}
        findEspnLeague={findEspnLeague}
        onAddEspnLeague={addEspnLeague}
      />

      {hasLinks(links) && (
        <LinkedAccounts
          links={links}
          leagues={state.status === 'loaded' ? state.leagues : []}
          disabled={busy}
          onRemoveSleeper={removeSleeper}
          onRemoveEspnLeague={removeEspnLeague}
        />
      )}

      {state.status === 'loading' && <p className="status">Loading leagues…</p>}

      {state.status === 'error' && (
        <p className="status" role="alert">
          Couldn’t load leagues. {state.message}
        </p>
      )}

      {state.status === 'loaded' && (
        <section>
          <div className="results-header">
            <h2>
              {state.season} season
              {usingMock && ` · week ${state.week}`}
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
          {state.warnings.map((warning) => (
            <p key={warning} className="status" role="alert">
              {warning}
            </p>
          ))}
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
                <button
                  type="button"
                  aria-pressed={view === 'scenarios'}
                  onClick={() => setView('scenarios')}
                >
                  Win scenarios
                </button>
                <button
                  type="button"
                  aria-pressed={view === 'stats'}
                  onClick={() => setView('stats')}
                >
                  Stats
                </button>
              </div>
              {view === 'stats' ? (
                <StatsView leagues={state.leagues} directory={state.players} />
              ) : view === 'scenarios' ? (
                <WinScenarios
                  leagues={state.leagues}
                  directory={state.players}
                  stats={state.stats}
                  week={state.week}
                  timing={timingOf(state.week, state.currentWeek)}
                  games={state.games}
                />
              ) : view === 'leagues' ? (
                <LeagueList
                  leagues={state.leagues}
                  timing={timingOf(state.week, state.currentWeek)}
                  directory={state.players}
                />
              ) : (
                <PlayersTable
                  players={combinePlayers(state.leagues)}
                  directory={state.players}
                  injuries={state.injuries}
                />
              )}
            </div>
          )}
        </section>
      )}
    </main>
  )
}

export default App
