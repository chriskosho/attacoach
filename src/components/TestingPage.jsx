import TestTools from './TestTools.jsx'
import { loadScenario } from '../lib/scenarios.js'
import { clearEverything } from '../lib/db.js'
import { go } from '../lib/route.js'

// Hidden review page at #/testing. It is not linked from anywhere in the public build; it works
// with or without a team, so the ready-made teams are always reachable for reviewing.
export default function TestingPage() {
  const replay = async () => {
    if (!window.confirm('Delete everything on this device and start setup again? Save a backup first if you need these teams.')) return
    await clearEverything()
    go('today')
  }
  return (
    <main className="page">
      <section className="card" aria-labelledby="testing-title">
        <h1 className="sm-h" id="testing-title">Testing tools</h1>
        <p className="small muted">Add a ready-made team to try different situations. It becomes your current team; your other teams stay.</p>
        <TestTools
          label="Add a ready-made team"
          onPick={async (sc) => {
            await loadScenario(sc, { keepCoach: true })
            go('today')
          }}
        />
        <button className="btn quiet" onClick={replay}>
          Start over and replay setup
        </button>
        <a className="link-btn" href="#/today">Back to AttaCoach</a>
      </section>
    </main>
  )
}
