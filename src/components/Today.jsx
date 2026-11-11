import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, savePlan, setSetting } from '../lib/db.js'
import { buildPlan, totalMinutes, localDate, recentPlans } from '../lib/plan.js'
import { go, store } from '../lib/route.js'
import { lengthsFor, focusSummary, greeting, starterNeeds, divIndex, athleticDefault, SPACES, EQUIPMENT, WEEKDAYS, spaceLabel } from '../data/constants.js'
import { teamPractices, nextPractice, practiceOn, staffingText } from '../lib/practices.js'
import Stepper from './Stepper.jsx'
import SkillChips from './SkillChips.jsx'
import { AthleticToggle } from './PracticeSetup.jsx'
import { COACH_TIPS, pick } from '../data/motivation.js'
import NeedsRanker from './NeedsRanker.jsx'
import { TeamHeader } from './Header.jsx'
import { useSuggestion, SuggestionList } from './Log.jsx'
import { nextPlan, planNeedingRecap } from '../lib/todayRules.js'

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

export default function Today({ team, coach = '', players = [] }) {
  const lengths = lengthsFor(team.division)
  const young = divIndex(team.division) <= divIndex('6U')
  const practices = teamPractices(team)
  // Start on the next practice in the team's week, with its date, length and space.
  const [start] = useState(() => nextPractice(practices))
  const fitLength = (m) => (lengths.includes(m) ? m : lengths.includes(60) ? 60 : lengths[lengths.length - 1])
  const [practiceId, setPracticeId] = useState(start.practice.id)
  const [date, setDate] = useState(start.date)
  const [minutes, setMinutes] = useState(fitLength(start.practice.minutes ?? store.get('minutes', 60)))
  const [spaces, setSpaces] = useState(start.practice.spaces ?? ['field'])
  const [adults, setAdults] = useState(store.get('adults', store.get('coaches', 2)))
  // Kids expected starts from the roster when there is one, and from the last count otherwise.
  const [kids, setKids] = useState(players.length > 0 ? players.length : store.get('kids', 12))
  const [role, setRole] = useState('auto')
  const [equipment, setEquipment] = useState(team.equipment ?? null)
  const [athletic, setAthletic] = useState(team.athletic ?? athleticDefault(team.division))
  const teamFocus = team.needs?.length ? team.needs : starterNeeds(team.division)
  const [focus, setFocus] = useState(teamFocus)
  const [building, setBuilding] = useState(false)

  const plans = useLiveQuery(() => db.plans.where('teamId').equals(team.id).toArray().then(sortPlans), [team.id])
  const latest = plans?.[0] ?? null
  const debriefs = useLiveQuery(() => db.debriefs.where('teamId').equals(team.id).toArray(), [team.id])
  const upcoming = plans ? nextPlan(plans) : null
  const needsRecap = plans && debriefs ? planNeedingRecap(plans, debriefs) : null

  const choosePractice = (p) => {
    setPracticeId(p.id)
    setMinutes(fitLength(p.minutes))
    setSpaces(p.spaces?.length ? p.spaces : ['field'])
  }
  const changeDate = (iso) => {
    setDate(iso)
    const p = practiceOn(practices, iso)
    if (p) choosePractice(p)
  }

  const { suggestion } = useSuggestion(team)
  const matches = suggestion && suggestion.needs.every((n, i) => focus[i] === n)
  const useSuggested = suggestion && !matches
  // The suggested needs go first and the rest of the list stays below them.
  const applySuggestion = () => setFocus([...suggestion.needs, ...focus.filter((n) => !suggestion.needs.includes(n))])
  const tip = pick(COACH_TIPS, new Date().toDateString())
  const changedFocus = focus.join() !== teamFocus.join()
  const chosen = practices.find((p) => p.id === practiceId)

  const build = async () => {
    setBuilding(true)
    store.set('minutes', minutes)
    store.set('adults', adults)
    store.set('kids', kids)
    // The last few plans before this practice, so practices vary and the week stays balanced.
    const recent = recentPlans(plans, date)
    const plan = buildPlan(team, {
      minutes,
      adults,
      kids,
      coachRole: role,
      spaces,
      equipment,
      athletic,
      focus,
      recent,
      practiceName: chosen && practices.length > 1 ? chosen.name : chosen?.id === 'default' ? null : chosen?.name ?? null,
      date,
      seed: Date.now(),
    })
    await savePlan(plan)
    go(`plan/${plan.id}`)
  }

  const setupSummary = [`${minutes} min`, `${adults} ${adults === 1 ? 'adult' : 'adults'}`, `${kids} ${kids === 1 ? 'kid' : 'kids'}`, spaces.map(spaceLabel).join(' + '), athletic ? 'athletic warm-up' : null].filter(Boolean).join(', ')

  return (
    <>
      <TeamHeader team={team} />
      <main className="page">
        {coach ? <p className="greeting">{greeting(coach)}</p> : <NamePrompt coach={coach} />}
        {upcoming && (
          <section className="card next-card" aria-labelledby="next-title">
            <span className="muted small">Next practice</span>
            <h2 id="next-title">
              {planDate(upcoming)}, {totalMinutes(upcoming)} minutes
            </h2>
            <span className="small muted">
              {upcoming.practiceName ? `${upcoming.practiceName}. ` : ''}Focus: {focusSummary(upcoming.focus)}
            </span>
            <div className="action-row">
              <button className="btn big" onClick={() => go(`run/${upcoming.id}`)}>
                Start practice
              </button>
              <button className="btn quiet" onClick={() => go(`plan/${upcoming.id}`)}>
                Open plan
              </button>
            </div>
          </section>
        )}

        <section className="card" aria-labelledby="build-title">
          <h2 id="build-title">{upcoming ? 'Plan another practice' : 'Plan a practice'}</h2>

          {practices.length > 1 && (
            <div className="stack">
              <strong className="small">Which practice?</strong>
              <div className="chips" role="group" aria-label="Which practice">
                {practices.map((p) => (
                  <button key={p.id} type="button" className="chip" aria-pressed={practiceId === p.id} onClick={() => choosePractice(p)}>
                    {p.name}
                    {p.day != null ? ` (${WEEKDAYS[p.day]})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="field">
            Practice date
            <input type="date" value={date} onChange={(e) => changeDate(e.target.value || localDate())} />
          </label>

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

          <button className="btn big" onClick={build} disabled={building || focus.length === 0}>
            Build practice plan
          </button>
          {focus.length === 0 && <span className="muted small">Pick at least one thing to work on.</span>}

          <details className="day-setup">
            <summary>
              Change today's setup <span className="small muted">{setupSummary}</span>
            </summary>
            <div className="stack">
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
                <div className="row">
                  <strong className="small spacer" id="adults-label">
                    Adults at practice, counting you
                  </strong>
                  <Stepper label="Adults at practice" value={adults} onChange={setAdults} min={1} max={10} />
                </div>
                <span className="muted small">{staffingText({ adults, kids, role, young })}</span>
              </div>
              <div className="stack">
                <strong className="small">Where is practice?</strong>
                <SkillChips options={SPACES} value={spaces} onChange={(v) => setSpaces(v.length ? v : spaces)} label="Spaces today" />
              </div>
              <div className="row">
                <strong className="small spacer">Kids expected</strong>
                <Stepper label="Kids expected" value={kids} onChange={setKids} min={1} max={30} />
              </div>
              {adults > 1 && (
                <div className="stack">
                  <strong className="small">Your role</strong>
                  <div className="seg" role="group" aria-label="Your role">
                    {[
                      ['auto', 'Suggest'],
                      ['float', 'Float'],
                      ['run', 'Run a station'],
                    ].map(([id, label]) => (
                      <button key={id} type="button" aria-pressed={role === id} onClick={() => setRole(id)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="stack">
                <strong className="small">Equipment today</strong>
                <SkillChips options={EQUIPMENT} value={equipment ?? []} onChange={setEquipment} label="Equipment today" />
              </div>
              <AthleticToggle checked={athletic} onChange={setAthletic} />

              {!team.needs?.length && (
                <p className="small muted" style={{ margin: 0 }}>
                  Using a starter focus on the basics. Choose your team's skills in Edit team, or add players on the Team tab.
                </p>
              )}
              <div className="stack">
                <div className="row">
                  <strong className="small spacer">Today's focus</strong>
                  {changedFocus && (
                    <button className="btn ghost small" onClick={() => setFocus(teamFocus)}>
                      Use team needs
                    </button>
                  )}
                </div>
                <NeedsRanker division={team.division} value={focus} onChange={setFocus} />
              </div>
            </div>
          </details>
        </section>

        {latest && !upcoming && (
          <>
            <button className="card" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => go(`plan/${latest.id}`)}>
              <span className="muted small">Latest plan</span>
              <strong>
                {planDate(latest)}, {totalMinutes(latest)} minutes
              </strong>
              <span className="small muted">Focus: {focusSummary(latest.focus)}</span>
            </button>
            {needsRecap?.id === latest.id && (
              <p className="small muted recap-line">
                How did it go?{' '}
                <button className="link-btn" onClick={() => go(`debrief/practice/${latest.id}`)}>
                  2-minute recap
                </button>
              </p>
            )}
          </>
        )}

        <section className="card" aria-labelledby="coach-corner">
          <h3 id="coach-corner">Coach Corner</h3>
          <p className="small muted" style={{ margin: 0 }}>
            Game day huddles, what to say when a kid strikes out or a pitcher struggles, and how to run a great practice.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Today’s tip:</strong> {tip}
          </p>
          <button className="btn quiet" onClick={() => go('coach')}>
            Open Coach Corner
          </button>
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
