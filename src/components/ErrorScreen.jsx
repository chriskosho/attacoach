import { Component, useState } from 'react'
import { saveBackupFile } from '../lib/backupFile.js'
import { VERSION } from '../changelog.js'

// Shown when the app crashes: calm words, a way back, and a way to save the data first.
// It does not rely on the rest of the app, so the backup works even though the app crashed.
export function ErrorScreen({ error }) {
  const [msg, setMsg] = useState('')
  const text = `AttaCoach ${VERSION}\n${error?.stack || error?.message || String(error)}`

  const backup = async () => {
    try {
      const data = await saveBackupFile()
      setMsg(`Saved a backup of ${data.teams.length} ${data.teams.length === 1 ? 'team' : 'teams'} and ${data.plans.length} ${data.plans.length === 1 ? 'plan' : 'plans'}.`)
    } catch {
      setMsg('The backup could not be saved. Your data has not been changed.')
    }
  }
  const reload = () => {
    try {
      window.location.hash = '#/today'
    } catch {
      /* ignore */
    }
    window.location.reload()
  }

  return (
    <div className="error-screen" role="alert">
      <h1>Something went wrong</h1>
      <p>Sorry about that. This screen did not change your teams or plans, which are still saved on this device.</p>
      <div className="stack">
        <button className="btn big" onClick={reload}>
          Reload
        </button>
        <button className="btn quiet" onClick={backup}>
          Save a backup first
        </button>
      </div>
      {msg && (
        <p className="small" role="status">
          {msg}
        </p>
      )}
      <p className="small muted">If it keeps happening, send this to the person who gave you AttaCoach:</p>
      <pre className="error-text" tabIndex={0} aria-label="Error details">
        {text}
      </pre>
    </div>
  )
}

export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error) {
    console.error(error)
  }
  render() {
    return this.state.error ? <ErrorScreen error={this.state.error} /> : this.props.children
  }
}
