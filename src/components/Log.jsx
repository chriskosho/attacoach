import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, saveDebrief, deleteDebrief } from '../lib/db.js'
import { go, store } from '../lib/route.js'
import { localDate, totalMinutes } from '../lib/plan.js'
import { DRILLS } from '../data/drills.js'
import { needLabel, needsForDivision } from '../data/constants.js'
import { AREAS, RATINGS, KINDS, areaLabel, sortEntries, weakAreas, strongAreas, resultText, suggestFocus } from '../lib/debrief.js'
import { NeedPicker } from './Setup.jsx'
import { TeamHeader } from './Header.jsx'
import { planDate, sortPlans } from './Today.jsx'
import { seasonSummary } from '../lib/season.js'

// Practices needed before the per-skill breakdown shows.
export const SEASON_BREAKDOWN_AT = 3

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

// Practices run, games logged, and how often each skill has come up in your plans.
export function SeasonCard({ team, plans, entries, today }) {
  const s = seasonSummary({ team, plans, debriefs: entries, today })
  if (s.practices === 0 && s.games === 0) {
    return (
      <section className="card" aria-labelledby="season-title">
        <h2 id="season-title">Season so far</h2>
        <p className="muted small">Once you have run a practice or logged a game, your totals and what you have covered show up here.</p>
      </section>
    )
  }
  // The skill breakdown means little until a few practices are in: one plain line until then.
  if (s.practices < SEASON_BREAKDOWN_AT) {
    const parts = [
      s.practices > 0 && `${s.practices} ${s.practices === 1 ? 'practice' : 'practices'}`,
      s.games > 0 && `${s.games} ${s.games === 1 ? 'game' : 'games'}`,
    ].filter(Boolean)
    return (
      <section className="card" aria-labelledby="season-title">
        <h2 id="season-title">Season so far</h2>
        <p className="muted small">
          {parts.join(' and ')} so far. The skill breakdown appears after {SEASON_BREAKDOWN_AT}.
        </p>
      </section>
    )
  }
  const shown = s.areas.filter((a) => a.onList || a.count > 0)
  return (
    <section className="card" aria-labelledby="season-title">
      <h2 id="season-title">Season so far</h2>
      <div className="season-nums">
        <div>
          <strong data-testid="season-practices">{s.practices}</strong>
          <span>{s.practices === 1 ? 'practice run' : 'practices run'}</span>
        </div>
        <div>
          <strong data-testid="season-games">{s.games}</strong>
          <span>{s.games === 1 ? 'game logged' : 'games logged'}</span>
        </div>
      </div>
      {shown.length > 0 && (
        <ul className="plain-list season-areas" aria-label="Skills practised">
          {shown.map((a) => (
            <li key={a.id}>
              <span>{a.label}</span>
              <strong>{a.count === 0 ? 'not yet' : `${a.count} of ${s.practices}`}</strong>
            </li>
          ))}
        </ul>
      )}
      {s.quiet && (
        <p className="suggest" role="note">
          {s.quiet.never
            ? `${s.quiet.label} is on your list but has not come up in your practices yet. Try a drill for it at the next one.`
            : `${s.quiet.label} has not come up in ${Math.floor(s.quiet.days / 7)} weeks. Try a drill for it at the next practice.`}
        </p>
      )}
    </section>
  )
}

export default function Log({ team }) {
  const { entries, suggestion } = useSuggestion(team)
  const plans = useLiveQuery(() => db.plans.where('teamId').equals(team.id).toArray(), [team.id])
  if (!entries || !plans) return <TeamHeader team={team} title="Log" />
  const sorted = sortEntries(entries)

  return (
    <>
      <TeamHeader team={team} title="Log" />
      <main className="page">
        <SeasonCard team={team} plans={plans} entries={entries} today={localDate()} />
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
            <button
              className="btn ghost"
              onClick={() => {
                // Land on Today with the planning form open, where this suggestion shows.
                store.set('openPlanForm', true)
                go('today')
              }}
            >
              Plan next practice
            </button>
          </section>
        )}

        {sorted.length === 0 ? (
          <div className="card empty">
            <h2>Nothing logged yet</h2>
            <p className="muted">Your games and practices will show up here, newest first.</p>
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
  // Older entries kept "What went well" and "What we saw" apart. They open together in one Notes box;
  // nothing is changed in storage until the coach saves.
  const [e, setE] = useState(() => ({ ...initial, notes: [initial.wentWell, initial.notes].map((x) => (x ?? '').trim()).filter(Boolean).join('\n\n'), wentWell: '' }))
  const [saving, setSaving] = useState(false)
  const [changing, setChanging] = useState(false)
  const [startOpen] = useState(() => Object.keys(initial.ratings ?? {}).length > 0)
  const linkedPlan = e.kind === 'practice' && e.planId ? plans.find((p) => p.id === e.planId) : null
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
      wentWell: '',
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
          {e.kind === 'game' ? (
            <>
              <label className="field">
                Date
                <input type="date" value={e.date} onChange={(ev) => set({ date: ev.target.value || localDate() })} />
              </label>
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
            <>
              <p className="recap-when">
                {linkedPlan ? `${planDate(linkedPlan)}, ${totalMinutes(linkedPlan)} minutes` : `${dateLabel(e.date)}, not linked to a plan`}
                {' · '}
                <button type="button" className="link-btn" aria-expanded={changing} onClick={() => setChanging((v) => !v)}>
                  {changing ? 'Done' : 'Change'}
                </button>
              </p>
              {changing && (
                <>
                  <label className="field">
                    Date
                    <input type="date" value={e.date} onChange={(ev) => set({ date: ev.target.value || localDate() })} />
                  </label>
                  {plans.length > 0 && (
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
                  )}
                </>
              )}
            </>
          )}
        </section>

        <section className="card">
          <h2 className="sm-h">Work on next time (pick up to 3)</h2>
          <p className="muted small">These count the most when AttaCoach suggests a focus.</p>
          <NeedPicker division={team.division} value={e.next ?? []} onChange={(next) => set({ next })} />
        </section>

        <details className="card fold" open={startOpen || undefined}>
          <summary>Rate each area (optional)</summary>
          <div className="fold-body">
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
          </div>
        </details>

        <section className="card">
          <label className="field">
            Notes
            <textarea rows={4} value={e.notes ?? ''} maxLength={3000} placeholder="What went well, what we saw. Overthrows to first, great hustle..." onChange={(ev) => set({ notes: ev.target.value })} />
          </label>
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
