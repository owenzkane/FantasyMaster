import { useState } from 'react'
import type { EspnAccount, EspnConnection } from '../platforms/types.ts'

interface Props {
  account: EspnAccount
  // whether this browser is connected; null while that's still being checked
  connection: EspnConnection | null
  onConnectionChange: (connection: EspnConnection) => void
  // whether the instructions and form are showing
  open: boolean
  onOpen: () => void
  onClose: () => void
  // called after a successful connect, so the league that needed it can be tried again
  onConnected: () => void
}

// Lets the visitor connect their ESPN account for private leagues, and explains how on the
// page: where the two values are, and what happens to them.
function EspnConnect({
  account,
  connection,
  onConnectionChange,
  open,
  onOpen,
  onClose,
  onConnected,
}: Props) {
  const [espnS2, setEspnS2] = useState('')
  const [swid, setSwid] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function connect() {
    setWorking(true)
    setError(null)
    const result = await account.connect(espnS2, swid)
    setWorking(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    // The values now live only in the browser's cookie; clear them off the page
    setEspnS2('')
    setSwid('')
    onConnectionChange('connected')
    onConnected()
  }

  async function disconnect() {
    await account.disconnect()
    onConnectionChange('disconnected')
  }

  if (connection === null) return null

  if (connection === 'unavailable') {
    return (
      <p className="espn-account help">
        Private ESPN leagues can’t be opened on this copy of the app. Public ones work as usual.
      </p>
    )
  }

  if (!open) {
    return connection === 'connected' ? (
      <p className="espn-account help">
        ESPN account connected for private leagues.{' '}
        <button type="button" className="btn btn-ghost" onClick={() => void disconnect()}>
          Disconnect
        </button>
      </p>
    ) : (
      <p className="espn-account">
        <button type="button" className="btn btn-ghost" onClick={onOpen}>
          Private league? Connect your ESPN account
        </button>
      </p>
    )
  }

  return (
    <section className="card espn-connect" aria-labelledby="espn-connect-title">
      <h3 id="espn-connect-title">
        {connection === 'connected' ? 'Update your ESPN login' : 'Connect your ESPN account'}
      </h3>
      <p>
        ESPN only shows a private league to its members. To read yours, the app needs two values
        from your ESPN login. It takes about a minute, and you only do it once on each browser.
      </p>

      <ol className="espn-steps">
        <li>
          <strong>On a computer, sign in at espn.com</strong> in this browser. Phone browsers don’t
          show these values.
        </li>
        <li>
          <strong>Open your browser’s developer tools</strong> on any espn.com page, then find its
          cookies:
          <ul>
            <li>
              <strong>Chrome or Edge:</strong> press Cmd+Option+I (Mac) or Ctrl+Shift+I (Windows),
              choose the Application tab, then Cookies, then https://www.espn.com.
            </li>
            <li>
              <strong>Firefox:</strong> press the same keys, choose the Storage tab, then Cookies,
              then https://www.espn.com.
            </li>
            <li>
              <strong>Safari:</strong> first turn on Settings, Advanced, “Show features for web
              developers”. Then press Cmd+Option+I and choose Storage, then Cookies.
            </li>
          </ul>
        </li>
        <li>
          <strong>Find the rows named espn_s2 and SWID</strong> and copy each one’s Value into the
          boxes below. The search box at the top of the list helps.
        </li>
      </ol>

      <form
        className="espn-connect-form"
        onSubmit={(event) => {
          event.preventDefault()
          void connect()
        }}
      >
        <label htmlFor="espn-s2">espn_s2</label>
        <input
          id="espn-s2"
          className="input"
          value={espnS2}
          onChange={(event) => setEspnS2(event.target.value)}
          placeholder="A long value starting with AE…"
          autoComplete="off"
          spellCheck={false}
        />
        <label htmlFor="espn-swid">SWID</label>
        <input
          id="espn-swid"
          className="input"
          value={swid}
          onChange={(event) => setSwid(event.target.value)}
          placeholder="{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}"
          autoComplete="off"
          spellCheck={false}
        />
        {error && (
          <p className="status" role="alert">
            {error}
          </p>
        )}
        <div className="espn-connect-actions">
          <button type="submit" className="btn" disabled={working || !espnS2 || !swid}>
            {working ? 'Connecting…' : 'Connect'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>

      <details className="espn-privacy">
        <summary>What happens to these values?</summary>
        <ul>
          <li>
            They’re kept only in this browser, in a cookie that this site’s pages can’t read and
            that’s only sent to this site’s own server.
          </li>
          <li>
            The server uses them for one thing: passing your request on to ESPN when you open a
            private league. It never saves or records them.
          </li>
          <li>
            Together they work like a login to your ESPN account, so don’t share them or paste them
            anywhere else.
          </li>
          <li>
            They stop working when you sign out of ESPN. If a private league stops loading, sign in
            to ESPN again and connect with the new values.
          </li>
          <li>Disconnect removes them from this browser at any time.</li>
        </ul>
      </details>
    </section>
  )
}

export default EspnConnect
