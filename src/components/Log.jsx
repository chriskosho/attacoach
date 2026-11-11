import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, saveDebrief, deleteDebrief } from '../lib/db.js'
import { go } from '../lib/route.js'
import { localDate, totalMinutes } from '../lib/plan.js'
import { DRILLS } from '../data/drills.js'
import { needLabel, needsForDivision } from '../data/constants.js'
import { AREAS, RATINGS, KINDS, areaLabel, sortEntries, weakAreas, strongAreas, resultText, suggestFocus } from '../lib/debrief.js'
import { NeedPicker } from './Setup.jsx'
import { TeamHeader } from './Header.jsx'
import { planDate, sortPlans } from './Today.jsx'

export function dateLabel(date) {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  } catch {
    return date ?? ''
  }
}

// What to work on next, from this team's logged games and practices. Null until something is logged.
export function useSuggestion(team) {
  const entries = useLiveQuery(() => db.debriefs.where('teamId').equals(team.id).toArray(), [team.id])
  if (!entries) return { entries: null, suggestion: null }
  return { entries, suggestion: suggestFocus(team, entries, needsForDivision(team.division, DRILLS).map((n) => n.id)) }
}

const sourceText = (r) => `${r.kind === 'game' ? 'game' : 'practice'} on ${dateLabel(r.date)}`

export function SuggestionList({ suggestion }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 20 }}>
      {suggestion.needs.map((n) => (
        <li key={n}>
          <strong>{needLabel(n)}</strong>
          <span className="small muted">
            {' '}
            ({suggestion.reasons[n].why}, {sourceText(suggestion.reasons[n])})
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function Log({ team }) {
  const { entries, suggestion } = useSuggestion(team)
  if (!entries) return <TeamHeader team={team} title="Log" />
  const sorted = sortEntries(entries)

  return (
    <>
      <TeamHeader team={team} title="Log" />
      <main className="page">
        <section className="card">
          <h2>After the game or practice</h2>
          <p className="muted small">Jot down what you saw. AttaCoach uses it to suggest what to work on at your next practice.</p>
          <div className="action-row">
            <button className="btn" onClick={() => go('debrief/game')}>
              Game debrief
            </button>
            <button className="btn quiet" onClick={() => go('debrief/practice')}>
              Practice recap
            </button>
          </div>
        </section>

        {suggestion && (
          <section className="card" aria-labelledby="next-title">
            <h3 id="next-title">Work on next</h3>
            <SuggestionList suggestion={suggestion} />
            <button className="btn" onClick={() => go('today')}>
              Plan next practice
            </button>
          </section>
        )}

        {sorted.length === 0 ? (
          <div className="card empty">
            <h2>Nothing logged yet</h2>
            <p className="muted">After your next game, tap Game debrief. It takes about two minutes.</p>
          </div>
        ) : (
          <div className="card flat">
            {sorted.map((e) => {
              const weak = weakAreas(e)
              const strong = strongAreas(e)
              const result = resultText(e)
              return (
                <button key={e.id} className="drill-row" onClick={() => go(`debrief/${e.id}`)}>
                  <strong>
                    {KINDS[e.kind]?.label ?? 'Entry'}, {dateLabel(e.date)}
                    {e.kind === 'game' && e.opponent ? ` vs ${e.opponent}` : ''}
                    {result ? `, ${result}` : ''}
                  </strong>
                  {weak.length > 0 && <span className="meta">Needs work: {weak.map(areaLabel).join(', ')}</span>}
                  {strong.length > 0 && <span className="meta">Strong: {strong.map(areaLabel).join(', ')}</span>}
                  {e.notes && <span className="meta">{e.notes.length > 90 ? `${e.notes.slice(0, 90)}...` : e.notes}</span>}
                </button>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}

// planId: a practice the recap is for (the timer's finish screen), so its date and plan are filled in.
const blank = (kind, team, plans, planId = null) => {
  const linked = kind === 'practice' && planId ? plans?.find((p) => p.id === planId) : null
  return {
  kind,
  teamId: team.id,
  date: linked?.date ?? localDate(),
  opponent: '',
  ourScore: '',
  theirScore: '',
  planId: kind === 'practice' ? linked?.id ?? plans?.[0]?.id ?? null : null,
  ratings: {},
  wentWell: '',
  notes: '',
  next: [],
  }
}

// id is 'game' or 'practice' for a new entry, or the id of an existing one.
export function DebriefForm({ team, id, planId = null }) {
  const isNew = id === 'game' || id === 'practice'
  const existing = useLiveQuery(() => (isNew ? null : db.debriefs.get(id)), [id])
  const plans = useLiveQuery(() => db.plans.where('teamId').equals(team.id).toArray().then(sortPlans), [team.id])
  if (!isNew && existing === undefined) return <TeamHeader team={team} title="Debrief" backTo="log" />
  if (!isNew && existing === null) {
    return (
      <>
        <TeamHeader team={team} title="Not found" backTo="log" />
        <main className="page">
          <div className="card empty">
            <p className="muted">That entry is gone.</p>
            <button className="btn" onClick={() => go('log')}>
              Back to the log
            </button>
          </div>
        </main>
      </>
    )
  }
  if (plans === undefined) return <TeamHeader team={team} title="Debrief" backTo="log" />
  return <Form key={`${id}:${planId ?? ''}`} team={team} plans={plans} initial={isNew ? blank(id, team, plans, planId) : existing} isNew={isNew} />
}

function Form({ team, plans, initial, isNew }) {
  const [e, setE] = useState(initial)
  const [saving, setSaving] = useState(false)
  const set = (patch) => setE((cur) => ({ ...cur, ...patch }))
  const kind = KINDS[e.kind] ?? KINDS.game

  const rate = (area, value) => {
    const ratings = { ...e.ratings }
    if (ratings[area] === value) delete ratings[area]
    else ratings[area] = value
    set({ ratings })
  }

  const score = (v) => v.replace(/[^0-9]/g, '').slice(0, 3)

  const save = async () => {
    setSaving(true)
    await saveDebrief({
      ...e,
      opponent: (e.opponent ?? '').trim(),
      wentWell: (e.wentWell ?? '').trim(),
      notes: (e.notes ?? '').trim(),
      ourScore: e.ourScore == null || e.ourScore === '' ? null : Number(e.ourScore),
      theirScore: e.theirScore == null || e.theirScore === '' ? null : Number(e.theirScore),
    })
    go('log')
  }

  const remove = async () => {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return
    await deleteDebrief(e.id)
    go('log')
  }

  return (
    <>
      <TeamHeader team={team} title={kind.title} backTo="log" />
      <main className="page">
        <section className="card">
          <label className="field">
            Date
            <input type="date" value={e.date} onChange={(ev) => set({ date: ev.target.value || localDate() })} />
          </label>

          {e.kind === 'game' ? (
            <>
              <label className="field">
                Opponent
                <input type="text" value={e.opponent ?? ''} placeholder="Team name" maxLength={60} onChange={(ev) => set({ opponent: ev.target.value })} />
              </label>
              <div className="action-row">
                <label className="field">
                  Our runs
                  <input type="text" inputMode="numeric" value={e.ourScore ?? ''} onChange={(ev) => set({ ourScore: score(ev.target.value) })} />
                </label>
                <label className="field">
                  Their runs
                  <input type="text" inputMode="numeric" value={e.theirScore ?? ''} onChange={(ev) => set({ theirScore: score(ev.target.value) })} />
                </label>
              </div>
            </>
          ) : (
            plans.length > 0 && (
              <label className="field">
                Which practice
                <select value={e.planId ?? ''} onChange={(ev) => set({ planId: ev.target.value || null })}>
                  <option value="">Not linked to a plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {planDate(p)}, {totalMinutes(p)} minutes
                    </option>
                  ))}
                </select>
              </label>
            )
          )}
        </section>

        <section className="card">
          <h3>How did it go?</h3>
          <p className="muted small">Tap a rating for each area. Skip anything you did not see. Tap again to clear.</p>
          {AREAS.map((a) => (
            <div className="stack" key={a.id}>
              <strong className="small" id={`area-${a.id}`}>
                {a.label}
              </strong>
              <div className="seg" role="group" aria-labelledby={`area-${a.id}`}>
                {RATINGS.map((r) => (
                  <button key={r.value} type="button" aria-pressed={e.ratings[a.id] === r.value} onClick={() => rate(a.id, r.value)}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="card">
          <label className="field">
            What went well
            <textarea rows={3} value={e.wentWell ?? ''} maxLength={1000} placeholder="Plays, players or habits to celebrate" onChange={(ev) => set({ wentWell: ev.target.value })} />
          </label>
          <label className="field">
            What we saw
            <textarea rows={4} value={e.notes ?? ''} maxLength={2000} placeholder="Overthrows to first, passive at bat, great hustle..." onChange={(ev) => set({ notes: ev.target.value })} />
          </label>
        </section>

        <section className="card">
          <h3>Work on at the next practice</h3>
          <p className="muted small">Optional. Pick up to three. These count the most when AttaCoach suggests a focus.</p>
          <NeedPicker division={team.division} value={e.next ?? []} onChange={(next) => set({ next })} />
        </section>

        <button className="btn big" onClick={save} disabled={saving}>
          {isNew ? 'Save' : 'Save changes'}
        </button>
        {!isNew && (
          <button className="btn danger" onClick={remove}>
            Delete this entry
          </button>
        )}
      </main>
    </>
  )
}
