import { useState } from 'react'
import { SCENARIOS } from '../data/scenarios.js'

// A list of ready-made teams. Tapping one loads it and calls onPick(scenario).
export default function TestTools({ onPick, label = 'Try a ready-made team' }) {
  const [busy, setBusy] = useState(null)
  const pick = async (sc) => {
    setBusy(sc.id)
    try {
      await onPick(sc)
    } finally {
      setBusy(null)
    }
  }
  return (
    <div className="choices" role="group" aria-label={label}>
      {SCENARIOS.map((sc) => (
        <button key={sc.id} type="button" className="choice" disabled={!!busy} onClick={() => pick(sc)}>
          <strong>{sc.title}</strong>
          <span>{busy === sc.id ? 'Loading…' : sc.blurb}</span>
        </button>
      ))}
    </div>
  )
}
