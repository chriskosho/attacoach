import { useState } from 'react'
import { DIVISIONS, EXPERIENCE, RULES, defaultRules, needsForDivision } from '../data/constants.js'
import NeedsRanker from './NeedsRanker.jsx'
import { DRILLS } from '../data/drills.js'
import { saveTeam, setSetting } from '../lib/db.js'

const STEPS = ['Team', 'You', 'Needs', 'Rules']
export const MAX_NEEDS = 3

export function NeedPicker({ division, value, onChange, max = MAX_NEEDS }) {
  const options = needsForDivision(division, DRILLS)
  const toggle = (id) => {
    if (value.includes(id)) onChange(value.filter((n) => n !== id))
    else if (value.length < max) onChange([...value, id])
  }
  return (
    <div className="chips" role="group" aria-label="Developmental needs">
      {options.map((n) => {
        const rank = value.indexOf(n.id)
        return (
          <button
            key={n.id}
            type="button"
            className="chip"
            aria-pressed={rank >= 0}
            title={n.help}
            disabled={rank < 0 && value.length >= max}
            onClick={() => toggle(n.id)}
          >
            {rank >= 0 && <span className="rank">{rank + 1}</span>}
            {n.label}
          </button>
        )
      })}
    </div>
  )
}

export function RuleToggles({ rules, onChange }) {
  return (
    <div>
      {RULES.map((r) => (
        <label className="toggle" key={r.id}>
          <span className="t-text">
            {r.label}
            <span>{r.help}</span>
          </span>
          <input
            type="checkbox"
            className="switch"
            checked={!!rules[r.id]}
            onChange={(e) => onChange({ ...rules, [r.id]: e.target.checked })}
          />
        </label>
      ))}
    </div>
  )
}

export default function Setup({ team = null, onDone, onCancel, first = false, coachName = '' }) {
  const editing = !!team
  const [step, setStep] = useState(0)
  const [name, setName] = useState(team?.name ?? '')
  const [you, setYou] = useState(coachName)
  const [division, setDivision] = useState(team?.division ?? null)
  const [experience, setExperience] = useState(team?.experience ?? null)
  const [needs, setNeeds] = useState(team?.needs ?? [])
  const [rules, setRules] = useState(team?.rules ?? null)
  const [rulesFor, setRulesFor] = useState(team?.division ?? null)
  const [rulesReset, setRulesReset] = useState(false)
  const [saving, setSaving] = useState(false)

  const pickDivision = (d) => {
    setDivision(d)
    // Drop needs that do not apply at the new age group.
    const allowed = new Set(needsForDivision(d, DRILLS).map((n) => n.id))
    setNeeds((cur) => cur.filter((n) => allowed.has(n)))
  }

  // Rules follow the division's defaults until the coach changes them.
  const currentRules = () => {
    if (rules && rulesFor === division) return rules
    return defaultRules(division)
  }

  const goTo = (next) => {
    if (next === 3 && rulesFor !== division) {
      if (rules) setRulesReset(true)
      setRules(defaultRules(division))
      setRulesFor(division)
    }
    setStep(next)
  }

  // The coach's name is asked on first run; later it is optional so older installs can still edit a team.
  const nameOk = !first || you.trim().length > 0
  const canNext = [!!division && name.trim().length > 0, !!experience && nameOk, needs.length > 0, true][step]

  const save = async () => {
    setSaving(true)
    const finalRules = currentRules()
    if (you.trim()) await setSetting('coachName', you.trim().replace(/\s+/g, ' '))
    await saveTeam({ ...(team ?? {}), name: name.trim(), division, experience, needs, rules: finalRules })
    onDone?.()
  }

  return (
    <div className="app">
      <header className="top" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <div className="row">
          {!first && (
            <button className="back" onClick={onCancel}>
              Cancel
            </button>
          )}
          <h1>{editing ? 'Edit team' : first ? 'Set up your team' : 'Add a team'}</h1>
          <span className="small">
            {step + 1} of {STEPS.length}
          </span>
        </div>
        <div className="steps-dots" aria-hidden="true">
          {STEPS.map((s, i) => (
            <i key={s} className={i <= step ? 'on' : ''} />
          ))}
        </div>
      </header>

      <main className="page" style={{ paddingBottom: 0 }}>
        {step === 0 && (
          <>
            {first && (
              <div className="hero-welcome">
                <h1>
                  Atta<span>Coach</span>
                </h1>
                <p>Practice plans built around what your team needs to work on. Answer four quick questions to get started.</p>
              </div>
            )}
            <div className="card">
              <label className="field">
                Team name
                <input
                  type="text"
                  value={name}
                  maxLength={40}
                  placeholder="e.g. Blue Jays"
                  onChange={(e) => setName(e.target.value)}
                  autoFocus={!first}
                />
              </label>
              <div className="stack">
                <strong className="small">Division</strong>
                <div className="seg" role="group" aria-label="Division">
                  {DIVISIONS.slice(0, 3).map((d) => (
                    <button key={d} type="button" aria-pressed={division === d} onClick={() => pickDivision(d)}>
                      {d}
                    </button>
                  ))}
                </div>
                <div className="seg" role="group" aria-label="Division, older">
                  {DIVISIONS.slice(3).map((d) => (
                    <button key={d} type="button" aria-pressed={division === d} onClick={() => pickDivision(d)}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <div className="card">
            <label className="field">
              What's your name?
              <input type="text" value={you} maxLength={40} placeholder="e.g. Chris" autoComplete="given-name" onChange={(e) => setYou(e.target.value)} />
            </label>
            <h2>How much have you coached?</h2>
            <p className="muted small">This sets how hard the drills are and how much coaching help each one shows. You can change it any time.</p>
            <div className="choices">
              {EXPERIENCE.map((x) => (
                <button key={x.id} type="button" className="choice" aria-pressed={experience === x.id} onClick={() => setExperience(x.id)}>
                  <strong>{x.label}</strong>
                  <span>{x.help}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card">
            <h2>What does your team most need to work on?</h2>
            <p className="muted small">
              Tap everything that applies. Each skill moves to your list. Put the most important first: plans spend the most time on number 1 and work down the list.
            </p>
            <NeedsRanker division={division} value={needs} onChange={setNeeds} />
          </div>
        )}

        {step === 3 && (
          <div className="card">
            <h2>Game rules</h2>
            <p className="muted small">
              Set to the usual rules for {division}. Turn off anything your league does not allow, and drills that teach it will be left out.
            </p>
            {rulesReset && <p className="note">You changed the division, so these were reset to the {division} defaults.</p>}
            <RuleToggles
              rules={currentRules()}
              onChange={(r) => {
                setRules(r)
                setRulesFor(division)
              }}
            />
          </div>
        )}

        <div className="wizard-nav">
          {step > 0 && (
            <button className="btn quiet" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          {editing && step < 3 && (
            <button className="btn ghost" disabled={!division || !name.trim() || !experience || !nameOk || !needs.length || saving} onClick={save}>
              Save
            </button>
          )}
          {step < 3 ? (
            <button className="btn" disabled={!canNext} onClick={() => goTo(step + 1)}>
              Next
            </button>
          ) : (
            <button className="btn" disabled={saving} onClick={save}>
              {editing ? 'Save team' : 'Save and start planning'}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
