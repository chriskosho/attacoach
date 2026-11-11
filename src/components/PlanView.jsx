import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, savePlan } from '../lib/db.js'
import {
  schedule, totalMinutes, fmtClock, alternatives, swapDrill, setBlockMinutes, moveBlock, removeBlock,
  addDrill, addBreak, hasPitching, eligibleDrills,
  rebuildPlan,
  missingGear,
} from '../lib/plan.js'
import { staffText } from '../lib/practices.js'
import CountStepper from './Stepper.jsx'
import { HuddlePoints, SayThis } from './CoachCorner.jsx'
import { cuesFor } from '../data/coaching.js'
import { drillById, DRILLS } from '../data/drills.js'
import { drillFor, sportOf, sportCopy } from '../lib/sport.js'

// A drill in the team's sport's wording.
const drillIn = (team) => (id) => drillFor(drillById(id), team)
import { categoryLabel, focusSummary, coachTitle, spaceLabel } from '../data/constants.js'
import { blockTitle, planText, shareText } from '../lib/share.js'
import { go } from '../lib/route.js'
import { TeamHeader } from './Header.jsx'
import { DrillText, LevelTag } from './DrillText.jsx'
import { DrillFilters, DrillList, filterDrills } from './Drills.jsx'
import Sheet from './Sheet.jsx'
import { planDate } from './Today.jsx'

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
        <button className="btn ghost small no-print" style={{ alignSelf: 'flex-start' }} onClick={() => setFull(!full)}>
          {full ? 'Show less' : 'Show setup, variations and equipment'}
        </button>
      )}
    </>
  )
}

export default function PlanView({ planId, team, coach = '' }) {
  const drillOf = drillIn(team)
  const plan = useLiveQuery(() => db.plans.get(planId), [planId])
  const [open, setOpen] = useState(() => new Set())
  const [swap, setSwap] = useState(null)
  const [adding, setAdding] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [toast, setToast] = useToast()

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
  const experienced = team.experience === 'experienced'
  // A coach who said they're unsure about a skill gets the full explanation for those drills.
  const unsureAbout = (d) => (team.unsure ?? []).some((n) => d.needs.includes(n))

  const total = totalMinutes(plan)
  const diff = total - plan.minutes
  const rows = schedule(plan)

  const share = async () => {
    const result = await shareText(`${team.name} practice plan`, planText(plan, team, coach))
    if (result === 'copied') setToast('Plan copied. Paste it into a text or email.')
    else if (result === 'failed') setToast('Sharing isn\'t available on this browser.')
  }

  const rebuild = async () => {
    if (!window.confirm('Build a new plan with the same length, setup and focus? Your changes to this plan will be replaced.')) return
    await update(rebuildPlan(team, plan, { seed: Date.now() }))
    setOpen(new Set())
    setToast('New plan built.')
  }

  // Helpers cancel and parents show up. Rebuild for the adults actually there, keeping most drills.
  const changeAdults = (n) => {
    const before = plan
    savePlan(rebuildPlan(team, plan, { adults: n }))
    setToast(`Reworked for ${n} ${n === 1 ? 'adult' : 'adults'}.`, () => savePlan(before))
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
          <div className="suggest no-print" role="note">
            <strong>This is a starter plan on the fundamentals for {team.division}.</strong>
            <span>Add your players or choose your team's skills and the next plan will be built around them.</span>
            <span className="action-row" style={{ width: '100%' }}>
              <button className="btn small" onClick={() => go('team')}>
                Add players
              </button>
              <button className="btn quiet small" onClick={() => go(`setup/${team.id}`)}>
                Choose skills
              </button>
            </span>
          </div>
        )}
        <div className="row wrap">
          <div className="spacer">
            <label>
              <span className="sr-only">Practice date</span>
              <strong>{planDate(plan)}</strong>{' '}
              <input
                type="date"
                className="date-edit no-print"
                aria-label="Practice date"
                value={plan.date ?? plan.createdAt.slice(0, 10)}
                onChange={(e) => e.target.value && update({ ...plan, date: e.target.value })}
              />
            </label>
            <div className="small muted">
              {[plan.practiceName, (plan.spaces ?? ['field']).map(spaceLabel).join(' + '), plan.kids ? `${plan.kids} kids` : null].filter(Boolean).join(', ')}. Focus:{' '}
              {focusSummary(plan.focus)}
            </div>
            {coach && <div className="small muted">Prepared by {coachTitle(coach)}</div>}
          </div>
          <span className={`time-total${diff > 0 ? ' over' : ''}`} aria-live="polite">
            {total} of {plan.minutes} min
          </span>
        </div>
        {diff !== 0 && (
          <p className="note">
            {diff > 0 ? `${diff} minutes over your practice length.` : `${-diff} minutes left to fill.`} Adjust a block's minutes or {diff > 0 ? 'remove' : 'add'} a drill.
          </p>
        )}

        <div className="row no-print">
          <span className="small spacer">
            <strong>Adults today</strong>
            <span className="muted">
              {' '}
              {(plan.adults ?? plan.coaches) === 1 ? 'Just you.' : plan.coachRole === 'float' ? 'You float and manage.' : 'You run a station.'}
            </span>
          </span>
          <CountStepper label="Adults today" value={plan.adults ?? plan.coaches ?? 1} onChange={changeAdults} min={1} max={10} />
        </div>

        <button className="btn big no-print" onClick={() => go(`run/${plan.id}`)}>
          Start practice
        </button>

        <div className="talk">
          <div className="who">Open practice with</div>
          {plan.opener}
          <details className="talk-more">
            <summary>Huddle talking points</summary>
            <HuddlePoints kind="practiceOpen" team={team} focus={plan.focus} />
          </details>
        </div>

        {hasPitching(plan) && team.rules?.kidPitch && (
          <p className="note">Count every pitch for each pitcher and follow your league's pitch limits and rest days.</p>
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
                        {categoryLabel(drill.category)} <LevelTag level={drill.level} />
                      </span>
                    )}
                    {b.kind === 'stations' && (
                      <span className="slot-sub">
                        {b.stations.length} × {b.stationMinutes} min: {b.stations.map((id) => drillOf(id)?.name).join(', ')}
                      </span>
                    )}
                    {b.kind === 'break' && <span className="slot-sub">Water and shade</span>}
                    {b.kind === 'huddle' && <span className="slot-sub">Bring it in and close strong</span>}
                  </span>
                  <span className="slot-min">
                    {b.kind === 'stations' ? b.stationMinutes * b.stations.length : b.minutes}
                    <small>min</small>
                  </span>
                </button>

                {isOpen(key) && (
                  <div className="slot-body">
                    {drill && <StationNotes drill={drill} plan={plan} groupSize={null} />}
                    {drill && <DrillBody drill={drill} sport={sportOf(team)} experienced={experienced && !unsureAbout(drill)} />}
                    {b.kind === 'drill' && !drill && <p className="muted">This drill is no longer in the library. Swap it for another.</p>}
                    {b.kind === 'break' && <p className="muted">Water for everyone. On hot days, add more breaks and find shade.</p>}
                    {b.kind === 'huddle' && (
                      <>
                        <div className="talk">
                          <div className="who">Close practice with</div>
                          {plan.closer}
                        </div>
                        <HuddlePoints kind="practiceClose" team={team} focus={plan.focus} />
                      </>
                    )}
                    {b.kind === 'stations' && (
                      <>
                        <p>
                          Split the team into {b.stations.length} groups{b.groups ? ` (${b.groups.join(', ')} kids)` : ''}. Every {b.stationMinutes} minutes, groups rotate to the next station until each group has done every one.
                        </p>
                        <div className="row no-print">
                          <span className="small muted spacer">Minutes at each station</span>
                          <Stepper label="Minutes at each station" value={b.stationMinutes} onChange={(m) => update(setBlockMinutes(plan, b.id, m))} />
                        </div>
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
                                      {categoryLabel(sd.category)} <LevelTag level={sd.level} />
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
                                  {sd && <DrillBody drill={sd} sport={sportOf(team)} experienced={experienced && !unsureAbout(sd)} />}
                                  <div className="edit-bar no-print">
                                    <button className="btn quiet small" onClick={() => setSwap({ blockId: b.id, stationIndex: si, drillId: id })}>
                                      Swap
                                    </button>
                                    <button className="btn danger small" onClick={() => removeWithUndo(removeBlock(plan, b.id, si, team.division), 'the station')}>
                                      Remove station
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </>
                    )}
                    {blockControls(b, i)}
                  </div>
                )}
              </li>
            )
          })}
        </ol>

        <div className="action-row no-print">
          <button className="btn quiet" onClick={() => setAdding(true)}>
            Add a drill
          </button>
          <button className="btn quiet" onClick={share}>
            Share
          </button>
          <button className="btn quiet" onClick={() => setPrinting(true)}>
            Print
          </button>
          <button className="btn quiet" onClick={rebuild}>
            Build a new one
          </button>
        </div>
        <button className="btn danger no-print" onClick={remove}>
          Delete plan
        </button>
      </main>

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
  const base = filters.fitsTeam ? eligibleDrills(team, { showAllLevels: true }) : DRILLS
  const list = filterDrills(base, { team, ...filters }).filter((d) => !inPlan.has(d.id))
  return (
    <Sheet title="Add a drill" onClose={onClose}>
      <p className="muted small">It goes in just before the team huddle. Move it from there.</p>
      <DrillFilters team={team} value={filters} onChange={setFilters} />
      <DrillList drills={list} onPick={onPick} />
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
