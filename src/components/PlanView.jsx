import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, savePlan } from '../lib/db.js'
import {
  schedule, totalMinutes, fmtClock, alternatives, swapDrill, setBlockMinutes, moveBlock, removeBlock,
  addDrill, addBreak, pitchNote, eligibleDrills,
  rebuildPlan, hasLocked,
  missingGear,
} from '../lib/plan.js'
import { saveTemplate } from '../lib/db.js'
import { staffText } from '../lib/practices.js'
import CountStepper from './Stepper.jsx'
import { HuddlePoints, SayThis } from './CoachCorner.jsx'
import { cuesFor } from '../data/coaching.js'
import { drillById, allDrills } from '../data/drills.js'
import { drillFor, sportOf, sportCopy } from '../lib/sport.js'

// A drill in the team's sport's wording.
const drillIn = (team) => (id) => drillFor(drillById(id), team)
import { categoryLabel, focusSummary, coachTitle, spaceLabel, lengthsFor, needLabel, SPACES } from '../data/constants.js'
import { describeChanges } from '../lib/changes.js'
import SkillChips from './SkillChips.jsx'
import { blockTitle, planText, shareText } from '../lib/share.js'
import { go } from '../lib/route.js'
import { TeamHeader } from './Header.jsx'
import { DrillText, LevelTag } from './DrillText.jsx'
import { DrillFilters, DrillList, DrillPrefs, filterDrills } from './Drills.jsx'
import Sheet from './Sheet.jsx'
import { planDate } from './Today.jsx'
import { PlanFeedback } from './Feedback.jsx'

// Toast message, optionally with an Undo action.
function useToast() {
  const [toast, setToast] = useState(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.undo ? 6000 : 2600)
    return () => clearTimeout(t)
  }, [toast])
  return [toast, (text, undo) => setToast(text ? { text, undo } : null)]
}

function Stepper({ value, onChange, label }) {
  return (
    <span className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="One minute less">
        −
      </button>
      <output>{value} min</output>
      <button type="button" onClick={() => onChange(value + 1)} aria-label="One minute more">
        +
      </button>
    </span>
  )
}

function DrillBody({ drill, experienced, sport }) {
  const [full, setFull] = useState(!experienced)
  const [cue] = sportCopy(cuesFor(drill), sport)
  return (
    <>
      {cue && <SayThis cue={cue} />}
      <DrillText drill={drill} compact={!full} sport={sport} />
      {experienced && (
        <button className="link-btn no-print" onClick={() => setFull(!full)}>
          {full ? 'Show less' : 'Show setup, variations and equipment'}
        </button>
      )}
    </>
  )
}

// The open block on the plan page: what to say, the steps, and a way to the full drill page.
// The full write-up (setup, coaching points, variations, equipment) is one tap away there.
function DrillShort({ drill, sport }) {
  const [cue] = sportCopy(cuesFor(drill), sport)
  return (
    <>
      {cue && <SayThis cue={cue} />}
      <ol className="short-steps">
        {drill.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      {!drill.deleted && (
        <button className="link-btn small" style={{ alignSelf: 'flex-start' }} onClick={() => go(`drill/${drill.id}`)}>
          Full drill: setup, coaching points and picture ›
        </button>
      )}
    </>
  )
}

// "2 adults": who is there. Opens Change of plans.
export function adultsLine(plan) {
  const n = plan.adults ?? plan.coaches ?? 1
  return `${n} ${n === 1 ? 'adult · Just you' : 'adults'}`
}

// One line for the top of the plan: "Tomorrow · 60 min · Cage · 12 kids".
export function planLine(plan) {
  const place = plan.practiceName ? plan.practiceName.replace(/\s+practice$/i, '') : (plan.spaces ?? ['field']).map(spaceLabel).join(' + ')
  return [`${plan.minutes} min`, place, plan.kids ? `${plan.kids} kids` : null].filter(Boolean)
}

// "Focus: Making contact +4", with the whole list one tap away.
function FocusLine({ focus = [] }) {
  if (!focus.length) return null
  const first = needLabel(focus[0])
  if (focus.length === 1) return <div className="small plan-link-static">Focus: {first}</div>
  return (
    <details className="focus-fold">
      <summary className="small" title={`Focus: ${focusSummary(focus)}`}>
        Focus: {first} +{focus.length - 1}
      </summary>
      <ol className="small focus-list">
        {focus.map((n) => (
          <li key={n}>{needLabel(n)}</li>
        ))}
      </ol>
    </details>
  )
}

function ShareSheet({ onText, onPrint, onClose }) {
  return (
    <Sheet title="Share this plan" onClose={onClose}>
      <p className="muted small">Send it to your helpers, or print it for the clipboard.</p>
      <button className="btn" onClick={onText}>
        Send or copy the plan
      </button>
      <button className="link-btn" onClick={onPrint}>
        Print
      </button>
    </Sheet>
  )
}

export default function PlanView({ planId, team, coach = '' }) {
  const drillOf = drillIn(team)
  const plan = useLiveQuery(() => db.plans.get(planId), [planId])
  const [open, setOpen] = useState(() => new Set())
  // Blocks whose edit buttons are showing. Kept by block id, so it survives the plan saving and redrawing.
  const [editing, setEditing] = useState(() => new Set())
  const [sharing, setSharing] = useState(false)
  const [swap, setSwap] = useState(null)
  const [adding, setAdding] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [toast, setToast] = useToast()
  const [changing, setChanging] = useState(false)
  const [naming, setNaming] = useState(false)
  // What the last change of plans did, with one Undo.
  const [changed, setChanged] = useState(null)

  useEffect(() => {
    if (!printing) return
    const done = () => setPrinting(false)
    window.addEventListener('afterprint', done)
    const t = setTimeout(() => window.print(), 50)
    return () => {
      clearTimeout(t)
      window.removeEventListener('afterprint', done)
    }
  }, [printing])

  if (plan === undefined) return null
  if (!plan) {
    return (
      <>
        <TeamHeader team={team} title="Plan" backTo="plans" />
        <main className="page">
          <div className="empty">
            <p>This plan was deleted or isn't on this device.</p>
            <button className="btn" onClick={() => go('today')}>
              Build a new plan
            </button>
          </div>
        </main>
      </>
    )
  }

  const update = (next) => savePlan(next)
  const removeWithUndo = (next, what) => {
    const before = plan
    savePlan(next)
    setToast(`Removed ${what}.`, () => savePlan(before))
  }
  const toggle = (key) =>
    setOpen((cur) => {
      const n = new Set(cur)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })
  const isOpen = (key) => printing || open.has(key)
  const toggleEdit = (key) =>
    setEditing((cur) => {
      const n = new Set(cur)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })
  const isEditing = (key) => !printing && editing.has(key)
  const experienced = team.experience === 'experienced'
  // A coach who said they're unsure about a skill gets the full explanation for those drills.
  const unsureAbout = (d) => (team.unsure ?? []).some((n) => d.needs.includes(n))

  const total = totalMinutes(plan)
  const diff = total - plan.minutes
  const rows = schedule(plan)

  const share = async () => {
    setSharing(false)
    const result = await shareText(`${team.name} practice plan`, planText(plan, team, coach))
    if (result === 'copied') setToast('Plan copied. Paste it into a text or email.')
    else if (result === 'failed') setToast('Sharing isn\'t available on this browser.')
  }

  const locked = hasLocked(plan)
  const rebuild = async () => {
    const ask = locked
      ? 'Rebuild everything you have not locked? Locked blocks keep their drill, minutes and place.'
      : 'Build a new plan with the same length, setup and focus? Your changes to this plan will be replaced.'
    if (!window.confirm(ask)) return
    await update(rebuildPlan(team, plan, { seed: Date.now() }))
    setOpen(new Set())
    setToast(locked ? 'Rebuilt around your locked blocks.' : 'New plan built.')
  }

  const toggleLock = (b) => update({ ...plan, blocks: plan.blocks.map((x) => (x.id === b.id ? { ...x, locked: !x.locked } : x)) })

  const prefsChanged = (list, on) => {
    if (list === 'favorites') setToast(on ? 'Added to favorites. Plans will pick it a bit more often.' : 'Removed from favorites.')
    else setToast(on ? "Plans won't suggest it again. It stays in this plan until you swap it." : 'Plans can suggest it again.')
  }

  const saveAsTemplate = async (name) => {
    setNaming(false)
    await saveTemplate(plan, name)
    setToast(`Saved "${name.trim()}". Start from it on the Today tab.`)
  }

  const applyChange = async (changes) => {
    const before = plan
    const after = rebuildPlan(team, plan, changes)
    await savePlan(after)
    setOpen(new Set())
    setChanging(false)
    setChanged({ lines: describeChanges(team, before, after).lines, before })
  }

  const undoChange = async () => {
    await savePlan(changed.before)
    setChanged(null)
    setToast('Back to the earlier plan.')
  }

  const remove = async () => {
    if (!window.confirm('Delete this plan? This cannot be undone.')) return
    await db.plans.delete(plan.id)
    go('plans')
  }

  const pickSwap = async (drill) => {
    await update(swapDrill(plan, swap.blockId, drill.id, swap.stationIndex, team.division))
    setSwap(null)
    setToast(`Swapped in ${drill.name}.`)
  }

  const pickAdd = async (drill) => {
    await update(addDrill(plan, drill.id, team.division))
    setAdding(false)
    setToast(`Added ${drill.name}.`)
  }

  const blockControls = (b, i) => (
    <div className="edit-bar no-print">
      <button className="btn quiet small" aria-pressed={!!b.locked} onClick={() => toggleLock(b)}>
        {b.locked ? 'Unlock' : 'Lock'}
      </button>
      {b.kind !== 'stations' && <Stepper label="Minutes" value={b.minutes} onChange={(m) => update(setBlockMinutes(plan, b.id, m))} />}
      {b.kind === 'drill' && (
        <button className="btn quiet small" onClick={() => setSwap({ blockId: b.id, stationIndex: null, drillId: b.drillId })}>
          Swap
        </button>
      )}
      <button className="icon-btn" disabled={i === 0} onClick={() => update(moveBlock(plan, b.id, -1))} aria-label="Move earlier">
        ↑
      </button>
      <button className="icon-btn" disabled={i === plan.blocks.length - 1} onClick={() => update(moveBlock(plan, b.id, 1))} aria-label="Move later">
        ↓
      </button>
      {b.kind !== 'huddle' && (
        <button className="btn quiet small" onClick={() => update(addBreak(plan, b.id))}>
          Add break after
        </button>
      )}
      {b.kind === 'drill' && drillById(b.drillId) && !drillById(b.drillId).deleted && <DrillPrefs team={team} drillId={b.drillId} small onChange={prefsChanged} />}
      <button className="btn danger small" onClick={() => removeWithUndo(removeBlock(plan, b.id), blockTitle(b, sportOf(team)).toLowerCase())}>
        Remove
      </button>
    </div>
  )

  return (
    <>
      <TeamHeader team={team} title="Practice plan" backTo="plans" />
      <main className="page">
        {!team.needs?.length && (
          <details className="starter-line no-print">
            <summary>Starter plan for {team.division}. Make it yours</summary>
            <span className="action-row">
              <button className="link-btn" onClick={() => go('team')}>
                Add players
              </button>
              <button className="link-btn" onClick={() => go(`setup/${team.id}`)}>
                Choose skills
              </button>
            </span>
          </details>
        )}
        <div className="plan-head">
          <div className="plan-top">
            <div className="plan-line">
              <strong>{planDate(plan)}</strong>
              {` · ${planLine(plan).join(' · ')}`}
            </div>
            <span className={`time-total${diff > 0 ? ' over' : ''}`} aria-live="polite">
              {total} of {plan.minutes} min
            </span>
          </div>
          <div className="plan-sub">
            <FocusLine focus={plan.focus} />
            <details className="plan-details no-print">
              <summary className="small">Date, template</summary>
              <button className="link-row" onClick={() => setChanging(true)}>
                {adultsLine(plan)} ›
              </button>
              <label className="field">
                Practice date
                <input
                  type="date"
                  className="date-edit"
                  value={plan.date ?? plan.createdAt.slice(0, 10)}
                  onChange={(e) => e.target.value && update({ ...plan, date: e.target.value })}
                />
              </label>
              <button className="link-btn" onClick={() => setNaming(true)}>
                Save as a template
              </button>
            </details>
          </div>
          {coach && <div className="small muted print-only">Prepared by {coachTitle(coach)}</div>}
        </div>
        {diff !== 0 && (
          <p className="note">
            {diff > 0 ? `${diff} minutes over your practice length.` : `${-diff} minutes left to fill.`} Adjust a block's minutes or {diff > 0 ? 'remove' : 'add'} a drill.
          </p>
        )}

        <div className="start-row no-print">
          <button className="btn big" onClick={() => go(`run/${plan.id}`)}>
            Start practice
          </button>
          <button className="link-btn" onClick={() => setChanging(true)}>
            Change of plans
          </button>
        </div>

        {changed && (
          <div className="suggest no-print" role="status">
            {changed.lines.map((l) => (
              <span key={l}>{l}</span>
            ))}
            <span className="action-row" style={{ width: '100%' }}>
              <button className="link-btn" onClick={undoChange}>
                Undo
              </button>
              <button className="link-btn muted-link" onClick={() => setChanged(null)}>
                OK
              </button>
            </span>
          </div>
        )}

        {printing ? (
          <div className="talk">
            <div className="who">Open practice with</div>
            {plan.opener}
            <HuddlePoints kind="practiceOpen" team={team} focus={plan.focus} seed={plan.date ?? plan.id} />
          </div>
        ) : (
          <details className="talk talk-fold fold">
            <summary>
              <span className="who">Open with:</span> <span className="talk-line">{plan.opener}</span>
            </summary>
            <div className="who" style={{ marginTop: 10 }}>
              Huddle talking points
            </div>
            <HuddlePoints kind="practiceOpen" team={team} focus={plan.focus} seed={plan.date ?? plan.id} />
          </details>
        )}


        <ol className="card flat lineup" aria-label="Practice blocks">
          {rows.map(({ block: b, start, end }, i) => {
            const key = b.id
            const drill = b.drillId ? drillOf(b.drillId) : null
            return (
              <li key={b.id} className={`slot ${b.kind}${isOpen(key) ? ' open' : ''}`}>
                <button className="slot-head" onClick={() => toggle(key)} aria-expanded={isOpen(key)}>
                  <span className="slot-time">
                    {fmtClock(start)}
                    <br />
                    <span className="small">{fmtClock(end)}</span>
                  </span>
                  <span>
                    <span className="slot-title">{blockTitle(b, sportOf(team))}</span>
                    <br />
                    {drill && (
                      <span className="slot-sub">
                        {categoryLabel(drill.category)} {drill.custom ? <span className="mark yours">Yours</span> : <LevelTag level={drill.level} />}
                      </span>
                    )}
                    {b.kind === 'stations' && (
                      <span className="slot-sub">
                        {b.stations.length} × {b.stationMinutes} min: {b.stations.map((id) => drillOf(id)?.name).join(', ')}
                      </span>
                    )}
                    {b.kind === 'break' && <span className="slot-sub">Water and shade</span>}
                    {b.kind === 'huddle' && <span className="slot-sub">Bring it in and close strong</span>}
                    {b.locked && (
                      <>
                        {' '}
                        <span className="mark locked">Locked</span>
                      </>
                    )}
                  </span>
                  <span className="slot-min">
                    {b.kind === 'stations' ? b.stationMinutes * b.stations.length : b.minutes}
                    <small>min</small>
                  </span>
                </button>

                {isOpen(key) && (
                  <div className="slot-body">
                    {drill && <StationNotes drill={drill} plan={plan} groupSize={null} />}
                    {drill && (printing ? <DrillBody drill={drill} sport={sportOf(team)} experienced={experienced && !unsureAbout(drill)} /> : <DrillShort drill={drill} sport={sportOf(team)} />)}
                    {b.kind === 'drill' && !drill && <p className="muted">This drill is no longer in the library. Swap it for another.</p>}
                    {b.kind === 'break' && <p className="muted">Water for everyone. On hot days, add more breaks and find shade.</p>}
                    {b.kind === 'huddle' && (
                      <>
                        <div className="talk">
                          <div className="who">Close practice with</div>
                          {plan.closer}
                        </div>
                        <HuddlePoints kind="practiceClose" team={team} focus={plan.focus} seed={plan.date ?? plan.id} />
                      </>
                    )}
                    {b.kind === 'stations' && (
                      <>
                        <p>
                          Split the team into {b.stations.length} groups{b.groups ? ` (${b.groups.join(', ')} kids)` : ''}. Every {b.stationMinutes} minutes, groups rotate to the next station until each group has done every one.
                        </p>
                        {isEditing(key) && <div className="row no-print">
                          <span className="small muted spacer">Minutes at each station</span>
                          <Stepper label="Minutes at each station" value={b.stationMinutes} onChange={(m) => update(setBlockMinutes(plan, b.id, m))} />
                        </div>}
                        {b.stations.map((id, si) => {
                          const sd = drillOf(id)
                          const skey = `${b.id}:${si}`
                          return (
                            <div className="station" key={skey}>
                              <button className="slot-head" onClick={() => toggle(skey)} aria-expanded={isOpen(skey)}>
                                <span className="station-num">{si + 1}</span>
                                <span>
                                  <span className="slot-title">{sd?.name ?? 'Missing drill'}</span>
                                  <br />
                                  {sd && (
                                    <span className="slot-sub">
                                      {categoryLabel(sd.category)} {sd.custom ? <span className="mark yours">Yours</span> : <LevelTag level={sd.level} />}
                                    </span>
                                  )}
                                  {b.staff?.[si] && (
                                    <>
                                      <br />
                                      <span className="station-staff">{staffText(b.staff[si], b.stations.map((x) => drillOf(x)?.name))}</span>
                                    </>
                                  )}
                                </span>
                                <span className="small muted">{isOpen(skey) ? 'Hide' : 'Open'}</span>
                              </button>
                              {isOpen(skey) && (
                                <div className="slot-body">
                                  <StationNotes drill={sd} plan={plan} groupSize={b.groups ? Math.max(...b.groups) : null} />
                                  {sd && (printing ? <DrillBody drill={sd} sport={sportOf(team)} experienced={experienced && !unsureAbout(sd)} /> : <DrillShort drill={sd} sport={sportOf(team)} />)}
                                  {isEditing(key) && <div className="edit-bar no-print">
                                    <button className="btn quiet small" onClick={() => setSwap({ blockId: b.id, stationIndex: si, drillId: id })}>
                                      Swap
                                    </button>
                                    {sd && !sd.deleted && <DrillPrefs team={team} drillId={id} small onChange={prefsChanged} />}
                                    <button className="btn danger small" onClick={() => removeWithUndo(removeBlock(plan, b.id, si, team.division), 'the station')}>
                                      Remove station
                                    </button>
                                  </div>}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </>
                    )}
                    <button className="btn quiet small no-print edit-toggle" onClick={() => toggleEdit(key)} aria-expanded={isEditing(key)}>
                      {isEditing(key) ? 'Done editing' : 'Edit'}
                    </button>
                    {isEditing(key) && blockControls(b, i)}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
        {/* The pitch-count reminder sits right under the blocks, so the first drill stays on the first screen. */}
        {pitchNote(plan, team) && <p className="note">{pitchNote(plan, team)}</p>}

        <div className="plan-links no-print">
          <button className="link-btn" onClick={() => setAdding(true)}>
            Add a drill
          </button>
          <button className="link-btn" onClick={() => setSharing(true)}>
            Share
          </button>
        </div>
        <PlanFeedback team={team} plan={plan} />
        <button className="link-btn quiet-delete quiet-rebuild no-print" onClick={rebuild}>
          {locked ? 'Rebuild the rest' : 'Build a new one'}
        </button>
        <button className="link-btn quiet-delete no-print" onClick={remove}>
          Delete plan
        </button>
      </main>

      {sharing && (
        <ShareSheet
          onText={share}
          onPrint={() => {
            setSharing(false)
            setPrinting(true)
          }}
          onClose={() => setSharing(false)}
        />
      )}
      {naming && <TemplateNameSheet initial={plan.practiceName ? `${plan.practiceName} template` : 'My practice'} onSave={saveAsTemplate} onClose={() => setNaming(false)} />}
      {changing && <ChangeSheet team={team} plan={plan} onApply={applyChange} onClose={() => setChanging(false)} />}
      {swap && <SwapSheet team={team} plan={plan} swap={swap} onPick={pickSwap} onClose={() => setSwap(null)} />}
      {adding && <AddSheet team={team} plan={plan} onPick={pickAdd} onClose={() => setAdding(false)} />}
      {toast && (
        <div className="toast" role="status">
          {toast.text}
          {toast.undo && (
            <button
              className="btn"
              onClick={() => {
                toast.undo()
                setToast(null)
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </>
  )
}

// Half the team is out, a helper cancelled, or it rained: set the day as it is now and rebuild.
// Asks for a template name inside the app (no browser pop-up), so it works with the phone keyboard open.
export function TemplateNameSheet({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial)
  const ok = name.trim().length > 0
  return (
    <Sheet title="Name this template" onClose={onClose} top>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (ok) onSave(name)
        }}
      >
        <label className="field">
          Template name
          <input type="text" value={name} maxLength={60} autoFocus enterKeyHint="done" onFocus={(e) => e.target.select()} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="action-row">
          <button type="submit" className="btn" disabled={!ok}>
            Save
          </button>
          <button type="button" className="btn quiet" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Sheet>
  )
}

function ChangeSheet({ team, plan, onApply, onClose }) {
  const [kids, setKids] = useState(plan.kids ?? 12)
  const [adults, setAdults] = useState(plan.adults ?? plan.coaches ?? 1)
  const [minutes, setMinutes] = useState(plan.minutes)
  const [spaces, setSpaces] = useState(plan.spaces?.length ? plan.spaces : ['field'])
  const lengths = [...new Set([...lengthsFor(team.division), plan.minutes])].sort((a, b) => a - b)
  const changed = kids !== (plan.kids ?? 12) || adults !== (plan.adults ?? plan.coaches ?? 1) || minutes !== plan.minutes || spaces.join() !== (plan.spaces ?? ['field']).join()
  return (
    <Sheet title="Change of plans" onClose={onClose}>
      <p className="muted small">Set the day as it is now. Drills that still fit stay in the plan.</p>
      <div className="chips" role="group" aria-label="Shortcuts">
        <button type="button" className="chip" onClick={() => setKids(Math.max(1, Math.min(kids, Math.round((plan.kids ?? kids) / 2))))}>
          Short on kids
        </button>
        <button type="button" className="chip" onClick={() => setAdults(1)}>
          I'm the only adult
        </button>
        <button type="button" className="chip" onClick={() => setSpaces(['gym'])}>
          Moved indoors
        </button>
      </div>
      <div className="row">
        <strong className="small spacer">Kids today</strong>
        <CountStepper label="Kids today" value={kids} onChange={setKids} min={1} max={30} />
      </div>
      <div className="row">
        <strong className="small spacer">Adults today</strong>
        <CountStepper label="Adults today" value={adults} onChange={setAdults} min={1} max={10} />
      </div>
      <div className="stack">
        <strong className="small">Minutes</strong>
        <div className="seg many" role="group" aria-label="Minutes today">
          {lengths.map((m) => (
            <button key={m} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="stack">
        <strong className="small">Where is practice?</strong>
        <SkillChips options={SPACES} value={spaces} onChange={(v) => setSpaces(v.length ? v : spaces)} label="Space today" />
      </div>
      <p className="muted small">Drills you swapped in by hand may change too. You can undo this right after.</p>
      <div className="sheet-actions">
        <button className="btn big" onClick={() => onApply({ kids, adults, minutes, spaces })} disabled={!changed}>
          Apply changes
        </button>
      </div>
    </Sheet>
  )
}

function SwapSheet({ team, plan, swap, onPick, onClose }) {
  const [harder, setHarder] = useState(false)
  const current = drillFor(drillById(swap.drillId), team)
  const list = alternatives(team, swap.drillId, plan, { showAllLevels: harder })
    .slice(0, 12)
    .map((d) => drillFor(d, team))
  return (
    <Sheet title={`Swap ${current?.name ?? 'drill'}`} onClose={onClose}>
      <p className="muted small">Similar drills for {team.division} that aren't already in this plan, closest match first.</p>
      {team.experience !== 'experienced' && (
        <label className="toggle">
          <span className="t-text">
            Include harder drills
            <span>Show drills above your experience setting.</span>
          </span>
          <input type="checkbox" className="switch" checked={harder} onChange={(e) => setHarder(e.target.checked)} />
        </label>
      )}
      <DrillList drills={list} onPick={onPick} />
    </Sheet>
  )
}

function AddSheet({ team, plan, onPick, onClose }) {
  const [filters, setFilters] = useState({ query: '', category: '', need: '', level: '', fitsTeam: true })
  const inPlan = new Set(plan.blocks.flatMap((b) => (b.kind === 'stations' ? b.stations : [b.drillId])))
  // Adding by hand can use any drill, including ones the coach said not to suggest.
  const base = filters.fitsTeam ? eligibleDrills(team, { showAllLevels: true, includeHidden: true }) : allDrills()
  const list = filterDrills(base, { team, ...filters }).filter((d) => !inPlan.has(d.id))
  return (
    <Sheet title="Add a drill" onClose={onClose}>
      <p className="muted small">It goes in just before the team huddle. Move it from there.</p>
      <DrillFilters team={team} value={filters} onChange={setFilters} />
      <DrillList drills={list} team={team} onPick={onPick} />
    </Sheet>
  )
}

// Gentle notes, never warnings: a quick swap for missing gear, and a tip when a group runs big.
function StationNotes({ drill, plan, groupSize }) {
  if (!drill) return null
  const missing = missingGear(drill, plan.equipment ?? null)
  const crowded = groupSize && groupSize > drill.cap[1]
  if (!missing.length && !crowded) return null
  return (
    <div className="suggest">
      {missing.length > 0 && drill.swap && <span>{drill.swap}</span>}
      {crowded && <span>{groupSize} kids is a big group for this one. Give the kids who are waiting a job, like shagging balls or dry swings.</span>}
    </div>
  )
}
