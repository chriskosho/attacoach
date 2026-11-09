import { EQUIPMENT, SPACES, WEEKDAYS, lengthsFor } from '../data/constants.js'
import { newPractice } from '../lib/practices.js'
import SkillChips from './SkillChips.jsx'

// How a team practices: its weekly practices, the gear it has, and the athletic warm-up.
// Controlled: value = { practices, equipment, athletic }. Everything here is optional.
export default function PracticeSetup({ division, value, onChange }) {
  const { practices, equipment, athletic } = value
  const set = (patch) => onChange({ ...value, ...patch })
  const setPractice = (id, patch) => set({ practices: practices.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
  const lengths = lengthsFor(division)

  return (
    <div className="stack">
      <div className="stack">
        <strong>Your weekly practices</strong>
        <span className="small muted">Optional. Add each practice you usually have, like a field day and a cage day.</span>
        {practices.map((p, i) => (
          <fieldset key={p.id} className="practice-box">
            <legend className="sr-only">Practice {i + 1}</legend>
            <div className="row">
              <label className="field spacer">
                Name
                <input type="text" value={p.name} maxLength={30} onChange={(e) => setPractice(p.id, { name: e.target.value })} />
              </label>
              <button type="button" className="btn ghost small" aria-label={`Remove ${p.name || 'practice'}`} onClick={() => set({ practices: practices.filter((x) => x.id !== p.id) })}>
                Remove
              </button>
            </div>
            <div className="stack">
              <strong className="small">Usual day (optional)</strong>
              <div className="chips" role="group" aria-label={`Day for ${p.name || 'practice'}`}>
                {WEEKDAYS.map((d, n) => (
                  <button key={d} type="button" className="chip" aria-pressed={p.day === n} onClick={() => setPractice(p.id, { day: p.day === n ? null : n })}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="stack">
              <strong className="small">Usual length</strong>
              <div className="seg" role="group" aria-label={`Length for ${p.name || 'practice'}`}>
                {lengths.map((m) => (
                  <button key={m} type="button" aria-pressed={p.minutes === m} onClick={() => setPractice(p.id, { minutes: m })}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="stack">
              <strong className="small">Where</strong>
              <SkillChips options={SPACES} value={p.spaces} onChange={(spaces) => setPractice(p.id, { spaces })} label={`Spaces for ${p.name || 'practice'}`} />
            </div>
          </fieldset>
        ))}
        <button type="button" className="btn quiet" onClick={() => set({ practices: [...practices, newPractice(division, practices.length + 1)] })}>
          Add a practice
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
