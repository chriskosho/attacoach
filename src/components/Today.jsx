import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, savePlan, setSetting } from '../lib/db.js'
import { buildPlan, totalMinutes, localDate } from '../lib/plan.js'
import { go, store } from '../lib/route.js'
import { lengthsFor, focusSummary, greeting } from '../data/constants.js'
import { COACH_TIPS, pick } from '../data/motivation.js'
import NeedsRanker from './NeedsRanker.jsx'
import { TeamHeader } from './Header.jsx'
import { useSuggestion, SuggestionList } from './Log.jsx'

// Friendly practice date: "Today", "Tomorrow" or "Sat, Nov 14".
export function planDate(plan) {
  try {
    const date = plan.date ?? localDate(new Date(plan.createdAt))
    const today = localDate()
    const tomorrow = localDate(new Date(Date.now() + 86400000))
    if (date === today) return 'Today'
    if (date === tomorrow) return 'Tomorrow'
    return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

// Newest practice date first; ties by when the plan was made.
export function sortPlans(plans) {
  const key = (p) => `${p.date ?? (p.createdAt ?? '').slice(0, 10)}|${p.createdAt ?? ''}`
  return [...plans].sort((a, b) => (key(a) < key(b) ? 1 : -1))
}

export default function Today({ team, coach = '' }) {
  const lengths = lengthsFor(team.division)
  const savedMinutes = store.get('minutes', 60)
  const [minutes, setMinutes] = useState(lengths.includes(savedMinutes) ? savedMinutes : lengths.includes(60) ? 60 : lengths[lengths.length - 1])
  const [coaches, setCoaches] = useState(store.get('coaches', 2))
  const [focus, setFocus] = useState(team.needs ?? [])
  const [building, setBuilding] = useState(false)
  const [date, setDate] = useState(localDate())

  const latest = useLiveQuery(
    () => db.plans.where('teamId').equals(team.id).toArray().then((r) => sortPlans(r)[0] ?? null),
    [team.id],
  )

  const { suggestion } = useSuggestion(team)
  const matches = suggestion && suggestion.needs.every((n, i) => focus[i] === n)
  const useSuggested = suggestion && !matches
  // The suggested needs go first and the rest of the list stays below them.
  const applySuggestion = () => setFocus([...suggestion.needs, ...focus.filter((n) => !suggestion.needs.includes(n))])
  const tip = pick(COACH_TIPS, new Date().toDateString())
  const changedFocus = focus.join() !== (team.needs ?? []).join()

  const build = async () => {
    setBuilding(true)
    store.set('minutes', minutes)
    store.set('coaches', coaches)
    const plan = buildPlan(team, { minutes, coaches, focus, date, seed: Date.now() })
    await savePlan(plan)
    go(`plan/${plan.id}`)
  }

  return (
    <>
      <TeamHeader team={team} />
      <main className="page">
        {coach ? <p className="greeting">{greeting(coach)}</p> : <NamePrompt coach={coach} />}
        <section className="card" aria-labelledby="build-title">
          <h2 id="build-title">Plan a practice</h2>

          <label className="field">
            Practice date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value || localDate())} />
          </label>

          <div className="stack">
            <strong className="small">How long is practice?</strong>
            <div className="seg" role="group" aria-label="Practice length in minutes">
              {lengths.map((m) => (
                <button key={m} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>
                  {m}
                </button>
              ))}
            </div>
            <span className="muted small">Minutes</span>
          </div>

          <div className="stack">
            <strong className="small">How many coaches will be there?</strong>
            <div className="seg" role="group" aria-label="Number of coaches">
              {[1, 2, 3, 4].map((c) => (
                <button key={c} type="button" aria-pressed={coaches === c} onClick={() => setCoaches(c)}>
                  {c === 4 ? '4+' : c}
                </button>
              ))}
            </div>
            <span className="muted small">
              {coaches === 1 ? 'One coach runs whole-team drills.' : `${Math.min(coaches, 3)} coaches can run stations that groups rotate through.`}
            </span>
          </div>

          {suggestion && (
            <div className="suggest" role="region" aria-label="Suggested focus">
              <strong>From your recent games and practices</strong>
              <SuggestionList suggestion={suggestion} />
              {useSuggested ? (
                <button className="btn small" onClick={applySuggestion}>
                  Use this focus
                </button>
              ) : (
                <span className="small muted">Today's focus matches.</span>
              )}
            </div>
          )}

          <div className="stack">
            <div className="row">
              <strong className="small spacer">Today's focus</strong>
              {changedFocus && (
                <button className="btn ghost small" onClick={() => setFocus(team.needs ?? [])}>
                  Use team needs
                </button>
              )}
            </div>
            <NeedsRanker division={team.division} value={focus} onChange={setFocus} />
          </div>

          <button className="btn big" onClick={build} disabled={building || focus.length === 0}>
            Build practice plan
          </button>
          {focus.length === 0 && <span className="muted small">Pick at least one thing to work on.</span>}
        </section>

        {latest && (
          <button className="card" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => go(`plan/${latest.id}`)}>
            <span className="muted small">Latest plan</span>
            <strong>
              {planDate(latest)}, {totalMinutes(latest)} minutes
            </strong>
            <span className="small muted">Focus: {focusSummary(latest.focus)}</span>
          </button>
        )}

        <section className="card">
          <h3>Coach's tip</h3>
          <p>{tip}</p>
        </section>
      </main>
    </>
  )
}

// Older installs never gave a name. Ask once, quietly, on the home screen.
function NamePrompt({ coach }) {
  const [name, setName] = useState('')
  const [hidden, setHidden] = useState(false)
  if (coach || hidden) return null
  const save = async () => {
    if (name.trim()) await setSetting('coachName', name.trim().replace(/\s+/g, ' '))
  }
  return (
    <section className="card" aria-label="Your name">
      <label className="field">
        What should we call you?
        <input type="text" value={name} maxLength={40} placeholder="e.g. Chris" autoComplete="given-name" onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="action-row">
        <button className="btn" disabled={!name.trim()} onClick={save}>
          Save
        </button>
        <button className="btn quiet" onClick={() => setHidden(true)}>
          Not now
        </button>
      </div>
    </section>
  )
}
