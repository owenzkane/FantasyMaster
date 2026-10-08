import { useState } from 'react'

interface Props {
  disabled: boolean
  onSubmit: (username: string) => void
}

function UsernameForm({ disabled, onSubmit }: Props) {
  const [username, setUsername] = useState('')

  return (
    <form
      className="username-form"
      onSubmit={(event) => {
        // Stop the browser's default behaviour of reloading the page on submit
        event.preventDefault()
        const trimmed = username.trim()
        if (trimmed) onSubmit(trimmed)
      }}
    >
      <label htmlFor="username">Sleeper username</label>
      <div className="username-form-row">
        <input
          id="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <button type="submit" disabled={disabled}>
          {disabled ? 'Loading…' : 'Show leagues'}
        </button>
      </div>
    </form>
  )
}

export default UsernameForm
