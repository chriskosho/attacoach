import { useState } from 'react'
import { DIVISIONS, EXPERIENCE, PLAYED, RULES, athleticDefault, defaultRules, needsForDivision } from '../data/constants.js'
import { rollupNeeds } from '../lib/roster.js'
import NeedsRanker from './NeedsRanker.jsx'
import Roster from './Roster.jsx'
import TestTools from './TestTools.jsx'
import { loadScenario } from '../lib/scenarios.js'
import { TEST_TOOLS } from '../config.js'
import PracticeSetup from './PracticeSetup.jsx'
import SkillChips from './SkillChips.jsx'
import { DRILLS } from '../data/drills.js'
import { saveTeam, savePlayers, setSetting } from '../lib/db.js'
import { SPORTS, formatsFor, defaultFormat, ruleText, sportOf } from '../lib/sport.js'

const STEPS = ['You', 'Coaching', 'Players', 'Needs', 'League', 'Practice']
const LAST = STEPS.length - 1
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

export function RuleToggles({ rules, onChange, sport = 'baseball' }) {
  return (
    <div>
      {RULES.map((r) => (
        <label className="toggle" key={r.id}>
          <span className="t-text">
            {ruleText(r, sport).label}
            <span>{ruleText(r, sport).help}</span>
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

export default function Setup({ team = null, onDone, onCancel, first = false, coachName = '', players: savedPlayers = [] }) {
  const editing = !!team
  const [step, setStep] = useState(0)
  const [name, setName] = useState(team?.name ?? '')
  const [you, setYou] = useState(coachName)
  const [played, setPlayed] = useState(team?.played ?? null)
  const [unsure, setUnsure] = useState(team?.unsure ?? [])
  const [players, setPlayers] = useState(() => savedPlayers.filter((p) => p.teamId === team?.id))
  const [needsTouched, setNeedsTouched] = useState(!!team?.needs?.length)
  const [fromRoster, setFromRoster] = useState(false)
  const [practice, setPractice] = useState({
    practices: team?.practices ?? [],
    equipment: team?.equipment ?? null,
    athletic: team?.athletic ?? null,
  })
  const [division, setDivision] = useState(team?.division ?? null)
  // Existing teams are baseball unless they say otherwise; a new team picks.
  const [sport, setSport] = useState(team ? sportOf(team) : null)
  const [format, setFormat] = useState(team?.format ?? null)
  const [experience, setExperience] = useState(team?.experience ?? null)
  const [needs, setNeeds] = useState(team?.needs ?? [])
  const [rules, setRules] = useState(team?.rules ?? null)
  const [rulesFor, setRulesFor] = useState(team ? `${team.division}|${sportOf(team)}|${sportOf(team) === 'softball' ? team.format ?? defaultFormat(team.division) : ''}` : null)
  const [rulesReset, setRulesReset] = useState(false)
  const [saving, setSaving] = useState(false)

  // Softball's format follows the age until the coach picks one, and stays valid for the age.
  const formatFor = (div, cur) => (cur && formatsFor(div).some((f) => f.id === cur) ? cur : defaultFormat(div))
  const teamFormat = sport === 'softball' && division ? formatFor(division, format) : null
  // Rules reset to the defaults when the age, sport or format changes.
  const rulesKey = `${division}|${sport ?? 'baseball'}|${teamFormat ?? ''}`

  const pickDivision = (d) => {
    setDivision(d)
    // Drop needs that do not apply at the new age group.
    const allowed = new Set(needsForDivision(d, DRILLS).map((n) => n.id))
    setNeeds((cur) => cur.filter((n) => allowed.has(n)))
    setUnsure((cur) => cur.filter((n) => allowed.has(n)))
  }

  // Rules follow the division's defaults until the coach changes them.
  const currentRules = () => {
    if (rules && rulesFor === rulesKey) return rules
    return defaultRules(division, sport ?? 'baseball', teamFormat)
  }

  const allowedNeeds = () => needsForDivision(division, DRILLS).map((n) => n.id)

  const goTo = (next) => {
    // First time on the needs step: start the list from what the players' weaknesses say.
    if (next === 3 && !needsTouched && needs.length === 0) {
      const suggested = rollupNeeds(players, allowedNeeds())
      if (suggested.length) {
        setNeeds(suggested)
        setFromRoster(true)
      }
    }
    if (next === 4 && rulesFor !== rulesKey) {
      if (rules) setRulesReset(true)
      setRules(defaultRules(division, sport ?? 'baseball', teamFormat))
      setRulesFor(rulesKey)
    }
    setStep(next)
  }

  // The coach's name is asked on first run; later it is optional so older installs can still edit a team.
  const nameOk = !first || you.trim().length > 0
  const canNext = [!!sport && !!division && name.trim().length > 0 && nameOk, !!experience, true, true, true, true][step]
  const readyToSave = !!sport && !!division && !!name.trim() && !!experience && nameOk

  const save = async () => {
    setSaving(true)
    const finalRules = currentRules()
    if (you.trim()) await setSetting('coachName', you.trim().replace(/\s+/g, ' '))
    const practices = practice.practices.map((p) => ({ ...p, name: p.name.trim() || 'Practice' }))
    const athletic = practice.athletic ?? athleticDefault(division)
    const row = await saveTeam({
      ...(team ?? {}),
      name: name.trim(),
      sport,
      format: teamFormat,
      division,
      experience,
      played,
      unsure,
      needs,
      rules: finalRules,
      practices,
      equipment: practice.equipment,
      athletic,
    })
    await savePlayers(row.id, players)
    onDone?.(row)
  }

  // Review shortcut: save a team right now using whatever is filled in, with sensible fallbacks.
  const skipSetup = async () => {
    setSaving(true)
    const d = division ?? '10U'
    const sp = sport ?? 'baseball'
    const fmt = sp === 'softball' ? formatFor(d, format) : null
    if (you.trim()) await setSetting('coachName', you.trim().replace(/\s+/g, ' '))
    const row = await saveTeam({
      name: name.trim() || 'My Team',
      sport: sp,
      format: fmt,
      division: d,
      experience: experience ?? 'some',
      played,
      unsure,
      needs,
      rules: division && rulesFor === rulesKey && rules ? rules : defaultRules(d, sp, fmt),
      practices: [],
      equipment: null,
      athletic: athleticDefault(d),
    })
    await savePlayers(row.id, players)
    onDone?.(row)
  }
  const tryScenario = async (sc) => onDone?.(await loadScenario(sc))

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
                <p>Practice plans built around what your team needs to work on. A few quick questions, and you can skip most of them.</p>
              </div>
            )}
            <div className="card">
              <label className="field">
                What's your name?
                <input type="text" value={you} maxLength={40} placeholder="e.g. Chris" autoComplete="given-name" onChange={(e) => setYou(e.target.value)} />
              </label>
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
                <strong className="small">Sport</strong>
                <div className="choices sport-pick" role="group" aria-label="Sport">
                  {SPORTS.map((x) => (
                    <button key={x.id} type="button" className="choice" aria-pressed={sport === x.id} onClick={() => setSport(x.id)}>
                      <strong>{x.label}</strong>
                    </button>
                  ))}
                </div>
              </div>
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
              {sport === 'softball' && division && (
                <div className="stack">
                  <strong className="small">Who pitches?</strong>
                  <div className="seg" role="group" aria-label="Softball format">
                    {formatsFor(division).map((f) => (
                      <button key={f.id} type="button" aria-pressed={teamFormat === f.id} onClick={() => setFormat(f.id)}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <span className="small muted">{formatsFor(division).find((f) => f.id === teamFormat)?.help}</span>
                </div>
              )}
            </div>
            {first && TEST_TOOLS && (
              <div className="card">
                <h3>Just looking around?</h3>
                <p className="small muted">Skip the questions, or load a ready-made team to see plans, the timer and Coach Corner.</p>
                <button className="btn quiet" disabled={saving} onClick={skipSetup}>
                  Skip setup
                </button>
                <details className="test-tools">
                  <summary>Ready-made test teams</summary>
                  <TestTools onPick={tryScenario} />
                </details>
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <div className="card">
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
            <div className="stack">
              <strong className="small">Have you played baseball or softball yourself? (optional)</strong>
              <div className="seg" role="group" aria-label="Played the game">
                {PLAYED.map((x) => (
                  <button key={x.id} type="button" aria-pressed={played === x.id} onClick={() => setPlayed(played === x.id ? null : x.id)}>
                    {x.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="stack">
              <strong className="small">What do you feel least sure about teaching? (optional)</strong>
              <span className="small muted">Drills for these skills show the full explanation, even if you're experienced.</span>
              <SkillChips options={needsForDivision(division, DRILLS)} value={unsure} onChange={setUnsure} label="Least sure about teaching" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card">
            <h2>Who's on your team?</h2>
            <p className="muted small">Optional. Add your players now, or skip and do it later from the Team tab. It helps AttaCoach see what the team needs.</p>
            <Roster division={division} players={players} onChange={setPlayers} />
          </div>
        )}

        {step === 3 && (
          <div className="card">
            <h2>What does your team most need to work on?</h2>
            <p className="muted small">
              Tap everything that applies. Each skill moves to your list. Put the most important first: plans spend the most time on number 1 and work down the list.
            </p>
            {fromRoster && needs.length > 0 && <p className="suggest">Started from your players' weak spots. Change anything.</p>}
            <NeedsRanker
              division={division}
              value={needs}
              onChange={(n) => {
                setNeedsTouched(true)
                setNeeds(n)
              }}
            />
            {needs.length === 0 && <p className="muted small">Skip this and AttaCoach builds a starter plan on the fundamentals for {division}.</p>}
          </div>
        )}

        {step === 4 && (
          <div className="card">
            <h2>How does your league play?</h2>
            <p className="muted small">
              Set to the usual rules for {division}. Turn off anything your league does not allow, and drills that teach it will be left out.
            </p>
            {rulesReset && <p className="note">You changed the team, so these were reset to the usual rules for {division}.</p>}
            <RuleToggles
              sport={sport ?? 'baseball'}
              rules={currentRules()}
              onChange={(r) => {
                setRules(r)
                setRulesFor(rulesKey)
              }}
            />
          </div>
        )}

        {step === 5 && (
          <div className="card">
            <h2>How do you practice?</h2>
            <p className="muted small">All optional. Skip it and plans assume a field practice; you can fill this in later on the Team tab.</p>
            <PracticeSetup
              division={division}
              value={{ ...practice, athletic: practice.athletic ?? athleticDefault(division) }}
              onChange={setPractice}
            />
          </div>
        )}

        <div className="wizard-nav">
          {step > 0 && (
            <button className="btn quiet" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          {editing && step < LAST && (
            <button className="btn ghost" disabled={!readyToSave || saving} onClick={save}>
              Save
            </button>
          )}
          {step < LAST ? (
            <button className="btn" disabled={!canNext} onClick={() => goTo(step + 1)}>
              {(step === 2 && players.length === 0) || (step === 3 && needs.length === 0) ? 'Skip for now' : 'Next'}
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
