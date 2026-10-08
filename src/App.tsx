import LeagueList from './components/LeagueList.tsx'
import UsernameForm from './components/UsernameForm.tsx'
import { useLeagues } from './hooks/useLeagues.ts'
import { usingMock } from './platforms/index.ts'
import './App.css'

function App() {
  const { state, load } = useLeagues()

  return (
    <main>
      <h1>FantasyMaster</h1>
      {usingMock && (
        <p className="mock-note">
          Mock data is on. Use the username <code>demo_user</code>.
        </p>
      )}

      <UsernameForm disabled={state.status === 'loading'} onSubmit={load} />

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
          <h2>
            {state.user.displayName} · {state.season} week {state.week}
          </h2>
          {state.leagues.length === 0 ? (
            <p className="status">No leagues found for the {state.season} season.</p>
          ) : (
            <LeagueList leagues={state.leagues} />
          )}
        </section>
      )}
    </main>
  )
}

export default App
