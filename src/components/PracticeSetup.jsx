import { useEffect, useState } from 'react'
import { EQUIPMENT, SPACES, WEEKDAYS, lengthsFor, spaceLabel } from '../data/constants.js'
import { newPractice, practiceStaff, staffSummary, dayName } from '../lib/practices.js'
import SkillChips from './SkillChips.jsx'
import Stepper from './Stepper.jsx'

// How many adults, counting the coach.
function AdultsPicker({ label, adults, onChange }) {
  return (
    <div className="row">
      <strong className="small spacer">{label}</strong>
      <Stepper label={label} value={adults} onChange={(n) => onChange({ adults: n })} min={1} max={10} />
    </div>
  )
}

// One line for a saved practice: "Tue, 60 min, field. 3 adults (just this one)".
function practiceLine(p, team) {
  const st = practiceStaff(team, p)
  const parts = [p.day != null ? dayName(p.day).slice(0, 3) : null, `${p.minutes} min`, p.spaces.map(spaceLabel).join(' and ').toLowerCase()].filter(Boolean)
  return `${parts.join(', ')}. ${st.own ? `${staffSummary(st.adults)} (just this one)` : 'Team adults'}`
}

const PRACTICE_STEPS = 3

// One practice at a time: name and day, then length and where, then who is there. Nothing changes
// in the list until the coach finishes the last step; Cancel leaves the list as it was.
function PracticeDraft({ division, draft, setDraft, team, onDone, onCancel, isNew }) {
  const { practice: p, sub } = draft
  const lengths = lengthsFor(division)
  const set = (patch) => setDraft({ ...draft, practice: { ...p, ...patch } })
  const st = practiceStaff(team, p)
  const label = p.name?.trim() || 'this practice'
  return (
    <section className="practice-box practice-draft" aria-labelledby="draft-title">
      <div className="draft-head">
        <h3 id="draft-title">{isNew ? 'Add a practice' : `Edit ${label}`}</h3>
        <span className="small muted">
          Step {sub + 1} of {PRACTICE_STEPS}
        </span>
      </div>
      {sub === 0 && (
        <>
          <label className="field">
            Name
            <input type="text" value={p.name} maxLength={30} autoFocus onChange={(e) => set({ name: e.target.value })} />
          </label>
          <div className="stack">
            <strong className="small">Usual day (optional)</strong>
            <div className="chips" role="group" aria-label={`Day for ${label}`}>
              {WEEKDAYS.map((d, n) => (
                <button key={d} type="button" className="chip" aria-pressed={p.day === n} onClick={() => set({ day: p.day === n ? null : n })}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      {sub === 1 && (
        <>
          <div className="stack">
            <strong className="small">Usual length</strong>
            <div className="seg many" role="group" aria-label={`Length for ${label}`}>
              {lengths.map((m) => (
                <button key={m} type="button" aria-pressed={p.minutes === m} onClick={() => set({ minutes: m })}>
                  {m}
                </button>
              ))}
            </div>
            <span className="muted small">Minutes</span>
          </div>
          <div className="stack">
            <strong className="small">Where</strong>
            <SkillChips options={SPACES} value={p.spaces} onChange={(spaces) => set({ spaces: spaces.length ? spaces : p.spaces })} label={`Spaces for ${label}`} />
          </div>
        </>
      )}
      {sub === 2 && (
        <div className="stack">
          <strong className="small">Adults at this practice</strong>
          <div className="choices" role="group" aria-label={`Adults at ${label}`}>
            <button type="button" className="choice" aria-pressed={!st.own} onClick={() => set({ adults: null })}>
              <strong>Same as the team</strong>
              <span>{staffSummary(team.adults)}</span>
            </button>
            <button type="button" className="choice" aria-pressed={st.own} onClick={() => !st.own && set({ adults: team.adults })}>
              <strong>Different for this one</strong>
              <span>Like a cage night with fewer helpers</span>
            </button>
          </div>
          {st.own && <AdultsPicker label="Adults at this practice, counting you" adults={st.adults} onChange={set} />}
        </div>
      )}
      <div className="draft-nav">
        <button type="button" className="link-btn" onClick={() => (sub === 0 ? onCancel() : setDraft({ ...draft, sub: sub - 1 }))}>
          {sub === 0 ? 'Cancel' : 'Back'}
        </button>
        {sub < PRACTICE_STEPS - 1 ? (
          <button type="button" className="btn" onClick={() => setDraft({ ...draft, sub: sub + 1 })}>
            Next
          </button>
        ) : (
          <button type="button" className="btn" onClick={onDone}>
            {isNew ? 'Add practice' : 'Save practice'}
          </button>
        )}
      </div>
    </section>
  )
}

// How a team practices: the adults who usually help, its weekly practices (added one at a time and
// checked in a list before saving), the gear it has, and the athletic warm-up. Everything is optional.
// Controlled: value = { adults, practices, equipment, athletic }. `onEditingChange(true)`
// while a practice is half-entered, so the screen can hide its own Save until that practice is done.
export default function PracticeSetup({ division, value, onChange, onEditingChange = () => {} }) {
  const { practices, equipment, athletic } = value
  const team = { adults: value.adults ?? 2 }
  const set = (patch) => onChange({ ...value, ...patch })
  const [draft, setDraft] = useState(null) // { index: number | null, practice, sub }
  const [status, setStatus] = useState('')
  useEffect(() => onEditingChange(!!draft), [draft]) // eslint-disable-line react-hooks/exhaustive-deps

  const startNew = () => {
    setStatus('')
    setDraft({ index: null, practice: newPractice(division, practices.length + 1), sub: 0 })
  }
  const finish = () => {
    const p = { ...draft.practice, name: draft.practice.name.trim() || 'Practice' }
    const next = draft.index == null ? [...practices, p] : practices.map((x, i) => (i === draft.index ? p : x))
    set({ practices: next })
    setStatus(draft.index == null ? `Added ${p.name}.` : `Updated ${p.name}.`)
    setDraft(null)
  }
  const remove = (i) => {
    setStatus(`Removed ${practices[i].name}.`)
    set({ practices: practices.filter((_, n) => n !== i) })
  }
  const overrides = practices.filter((p) => p.adults != null).length

  if (draft) {
    return (
      <PracticeDraft
        division={division}
        draft={draft}
        setDraft={setDraft}
        team={team}
        isNew={draft.index == null}
        onDone={finish}
        onCancel={() => setDraft(null)}
      />
    )
  }

  return (
    <div className="stack">
      <AdultsPicker label="Adults at practice, counting you" adults={team.adults} onChange={set} />
      <span className="small muted adults-help">Every practice starts from this. You can change it for one practice, and on the day.</span>

      <div className="stack">
        <strong>Your weekly practices</strong>
        {practices.length === 0 ? (
          <span className="small muted">Optional. Add each practice you usually have, like a field day and a cage day.</span>
        ) : (
          <>
            <span className="small muted">Check these before you save.</span>
            <ul className="practice-list" aria-label="Your weekly practices">
              {practices.map((p, i) => (
                <li key={p.id}>
                  <span className="practice-list-text">
                    <strong>{p.name}</strong>
                    <span className="small muted">{practiceLine(p, team)}</span>
                  </span>
                  <span className="practice-list-actions">
                    <button type="button" className="link-btn" aria-label={`Edit ${p.name}`} onClick={() => setDraft({ index: i, practice: { ...p }, sub: 0 })}>
                      Edit
                    </button>
                    <button type="button" className="link-btn muted-link" aria-label={`Remove ${p.name}`} onClick={() => remove(i)}>
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            {overrides > 0 && (
              <button type="button" className="link-btn practice-same" onClick={() => set({ practices: practices.map(({ adults, ...p }) => p) })}>
                Use the team's adults for every practice
              </button>
            )}
          </>
        )}
        {status && (
          <p className="small" role="status" style={{ margin: 0 }}>
            {status}
          </p>
        )}
        <button type="button" className="link-btn practice-add" onClick={startNew}>
          {practices.length ? 'Add another practice' : 'Add a practice'}
        </button>
      </div>

      <div className="stack">
        <strong>Equipment you can use</strong>
        <span className="small muted">Plans make the most of what you tap here. Nothing is required: missing gear just means a different drill or a quick swap.</span>
        <SkillChips options={EQUIPMENT} value={equipment ?? []} onChange={(eq) => set({ equipment: eq })} label="Equipment" />
      </div>

      <AthleticToggle checked={athletic} onChange={(v) => set({ athletic: v })} />
    </div>
  )
}

export function AthleticToggle({ checked, onChange }) {
  return (
    <label className="toggle">
      <span className="t-text">
        Athletic warm-up
        <span>A no-equipment bodyweight warm-up that scales with age. It replaces the usual warm-up.</span>
      </span>
      <input type="checkbox" className="switch" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}
