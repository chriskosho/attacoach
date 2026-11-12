import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db.js'
import { cuesFor } from '../data/coaching.js'
import { HuddlePoints } from './CoachCorner.jsx'
import { drillById } from '../data/drills.js'
import { blockTitle } from '../lib/share.js'
import { drillFor, sportOf } from '../lib/sport.js'
import { go, store } from '../lib/route.js'
import { staffTag } from '../lib/practices.js'
import { catchUp, behindSeconds, trimSegments } from '../lib/runMath.js'
import { DrillPicture, hasPicture } from './DrillDiagram.jsx'
import { PlanFeedback } from './Feedback.jsx'

// True on short screens (under 720 px tall), where a station block needs a tighter layout so every
// group row fits. Without matchMedia (tests, very old browsers) the usual layout is used.
const SHORT = '(max-height: 719.98px)'
function useShortScreen() {
  const mq = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(SHORT) : null)
  const [short, setShort] = useState(() => !!mq()?.matches)
  useEffect(() => {
    const m = mq()
    if (!m) return
    const on = () => setShort(m.matches)
    on()
    m.addEventListener?.('change', on)
    return () => m.removeEventListener?.('change', on)
  }, [])
  return short
}

// Turns a plan into timed segments. Each station rotation is its own segment.
export function segmentsFor(plan, sport = 'baseball') {
  const segs = []
  plan.blocks.forEach((b, bi) => {
    if (b.kind === 'stations') {
      const n = b.stations.length
      for (let r = 0; r < n; r++) {
        segs.push({ key: `${b.id}:${r}`, blockIndex: bi, kind: 'stations', title: 'Stations', seconds: b.stationMinutes * 60, stations: b.stations, rotation: r, rotations: n })
      }
    } else {
      segs.push({ key: b.id, blockIndex: bi, kind: b.kind, title: blockTitle(b, sport), seconds: b.minutes * 60, drillId: b.drillId })
    }
  })
  return segs
}

export function fmtTime(sec) {
  const s = Math.max(0, Math.ceil(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

let audioCtx = null
function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    if (!audioCtx) audioCtx = new AC()
    if (audioCtx.state === 'suspended') audioCtx.resume()
  } catch {
    /* no audio */
  }
}
function beep(times = 2) {
  try {
    if (!audioCtx) return
    for (let i = 0; i < times; i++) {
      const o = audioCtx.createOscillator()
      const g = audioCtx.createGain()
      o.frequency.value = 880
      o.connect(g)
      g.connect(audioCtx.destination)
      const t = audioCtx.currentTime + i * 0.35
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.4, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25)
      o.start(t)
      o.stop(t + 0.3)
    }
  } catch {
    /* no audio */
  }
  try {
    navigator.vibrate?.([300, 150, 300])
  } catch {
    /* no vibration */
  }
}

function useWakeLock(active) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock = null
    let cancelled = false
    const request = () =>
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (cancelled) l.release()
          else lock = l
        })
        .catch(() => {})
    request()
    const onVis = () => document.visibilityState === 'visible' && request()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      lock?.release().catch(() => {})
    }
  }, [active])
}

export default function RunTimer({ planId, team }) {
  const plan = useLiveQuery(() => db.plans.get(planId), [planId])
  if (plan === undefined) return null
  if (!plan) {
    go('plans')
    return null
  }
  return <Runner plan={plan} team={team} />
}

function Runner({ plan, team }) {
  const baseSegs = useMemo(() => segmentsFor(plan, sportOf(team)), [plan, team])
  const storeKey = `run:${plan.id}`
  const [state, setState] = useState(() => {
    const saved = store.get(storeKey)
    if (saved && saved.index < baseSegs.length) return { adj: {}, startedWall: null, ...saved }
    return { index: 0, startedAt: null, elapsed: 0, adj: {}, startedWall: null }
  })
  // The run's own lengths: +1 min and trimming change these, never the saved plan.
  const segs = useMemo(() => baseSegs.map((x) => ({ ...x, base: x.seconds, seconds: state.adj[x.key] ?? x.seconds })), [baseSegs, state.adj])
  const [note, setNote] = useState('')
  // After Trim: how many minutes were cut and the lengths from before, so Undo can put them back.
  const [trimmed, setTrimmed] = useState(null)
  const [openGroup, setOpenGroup] = useState(null)
  const [showPic, setShowPic] = useState(false)
  const [showOpen, setShowOpen] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [finished, setFinished] = useState(false)
  const running = state.startedAt != null
  const seg = segs[state.index]
  const elapsed = state.elapsed + (running ? (now - state.startedAt) / 1000 : 0)
  const remaining = seg ? seg.seconds - elapsed : 0
  const advanced = useRef(false)
  const [showHow, setShowHow] = useState(false)

  useWakeLock(running)
  const short = useShortScreen()

  useEffect(() => {
    store.set(storeKey, finished ? null : state)
  }, [state, finished, storeKey])

  useEffect(() => {
    if (state.startedWall == null && !running) return
    const t = setInterval(() => setNow(Date.now()), running ? 250 : 5000)
    return () => clearInterval(t)
  }, [running, state.startedWall])

  // When the screen wakes, update the clock now instead of waiting for the next tick.
  useEffect(() => {
    const onVis = () => document.visibilityState === 'visible' && setNow(Date.now())
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // A new block starts with its pictures and station details closed.
  useEffect(() => {
    setOpenGroup(null)
    setShowPic(false)
    setShowHow(false)
    setTrimmed(null)
  }, [seg?.key])

  // Notes ("Caught up", "Trimmed") fade on their own.
  useEffect(() => {
    if (!note) return
    const t = setTimeout(() => setNote(''), 6000)
    return () => clearTimeout(t)
  }, [note])

  const goToIndex = useCallback(
    (i, keepRunning) => {
      if (i >= segs.length) {
        setFinished(true)
        // Mark the plan finished so Today moves on to the next practice. Running it again later still works.
        db.plans.update(plan.id, { finishedAt: new Date().toISOString() })
        setState((s) => ({ ...s, index: segs.length - 1, startedAt: null, elapsed: 0 }))
        return
      }
      const t = Date.now()
      setNow(t)
      setState((s) => ({ ...s, index: Math.max(0, i), startedAt: keepRunning ? t : null, elapsed: 0 }))
    },
    [segs.length, plan.id],
  )

  // Auto-advance when a segment runs out.
  useEffect(() => {
    if (!running || remaining > 0) {
      advanced.current = false
      return
    }
    if (advanced.current) return
    advanced.current = true
    // If the screen was off, more than one block may have passed: land on the right one.
    const c = catchUp(segs.map((x) => x.seconds), state.index, 0, elapsed)
    beep(state.index + 1 < segs.length && segs[state.index + 1].kind === 'stations' && seg.kind === 'stations' ? 3 : 2)
    if (c.done) {
      goToIndex(segs.length, true)
      return
    }
    const t = Date.now()
    setNow(t)
    setState((s) => ({ ...s, index: c.index, startedAt: t, elapsed: c.elapsed }))
    if (-remaining > 3) setNote('Caught up after the screen was off')
  }, [running, remaining, elapsed, state.index, segs, seg, goToIndex])

  const toggleRun = () => {
    unlockAudio()
    const t = Date.now()
    setNow(t)
    if (running) setState((s) => ({ ...s, startedAt: null, elapsed: s.elapsed + (t - s.startedAt) / 1000 }))
    else setState((s) => ({ ...s, startedAt: t, startedWall: s.startedWall ?? t }))
  }

  const addMinute = () => setState((s) => ({ ...s, adj: { ...s.adj, [seg.key]: seg.seconds + 60 } }))

  const exit = () => {
    if (running && !window.confirm('Leave the timer? Practice time will pause here.')) return
    if (running) setState((s) => ({ ...s, startedAt: null, elapsed: s.elapsed + (Date.now() - s.startedAt) / 1000 }))
    go(`plan/${plan.id}`)
  }

  const totalSeconds = segs.reduce((s, x) => s + x.seconds, 0)
  const doneSeconds = segs.slice(0, state.index).reduce((s, x) => s + x.seconds, 0) + Math.min(elapsed, seg?.seconds ?? 0)
  const next = segs[state.index + 1]
  const drill = seg?.drillId ? drillFor(drillById(seg.drillId), team) : null
  const block = plan.blocks[seg?.blockIndex]
  // Before Start, the opener and huddle points are there to read; once the clock runs they get out of the way.
  const upFirst = state.index === 0 && !running && elapsed === 0
  const cue = drill ? cuesFor(drill)[0] : null
  // The line above the buttons: what comes next, and for a station rotation, where group 1 goes.
  const nextLine = !next
    ? 'Last block'
    : next.kind === 'stations' && next.rotation > 0
      ? `rotate. Group 1 → ${drillFor(drillById(next.stations[next.rotation % next.rotations]), team)?.name ?? 'next station'}, ${Math.round(next.seconds / 60)} min`
      : `${next.kind === 'stations' ? 'Stations' : next.title}, ${Math.round(next.seconds / 60)} min`

  const planned = baseSegs.reduce((n, x) => n + x.seconds, 0)
  const behind = behindSeconds({ startedWall: state.startedWall, now, totalNow: totalSeconds, doneNow: doneSeconds, totalPlanned: planned })
  const late = behind > 180 && !trimmed
  // Short screens during a station block: smaller clock, one-line controls, compact group rows.
  const compact = short && seg?.kind === 'stations'
  const rotateSoon = seg?.kind === 'stations' && seg.rotation + 1 < seg.rotations && remaining <= 30
  const trim = () => {
    const t = trimSegments(segs, seg.blockIndex, behind)
    if (!t.cut) {
      setNote('Nothing left to trim. Water breaks and the huddle stay as planned.')
      return
    }
    setTrimmed({ mins: Math.max(1, Math.round(t.cut / 60)), before: state.adj })
    setState((s) => ({ ...s, adj: { ...s.adj, ...t.seconds } }))
  }
  const undoTrim = () => {
    setState((s) => ({ ...s, adj: trimmed.before }))
    setTrimmed(null)
  }

  if (finished) {
    return (
      <div className="run" role="main">
        <div className="run-now">Practice complete</div>
        <div className="run-title">Great work, Coach.</div>
        <p className="run-now" style={{ marginTop: 16, fontSize: 16 }}>Send them home with:</p>
        <p style={{ fontSize: 20, marginTop: 4 }}>{plan.closer}</p>
        <PlanFeedback team={team} plan={plan} variant="run" />
        <div className="run-controls finish">
          <button className="main" onClick={() => go(`debrief/practice/${plan.id}`)}>
            2-minute recap
          </button>
          <button className="side" onClick={() => go('today')}>
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`run${compact ? ' compact-stations' : ''}`} role="main" aria-label="Practice timer">
      <div className="run-head">
      <div className="run-top">
        <button className="run-btn" onClick={exit}>
          Exit
        </button>
        <span className="spacer" />
        <span className="small">{team.name}</span>
      </div>
      <div className="run-progress" aria-hidden="true">
        <i style={{ width: `${(doneSeconds / totalSeconds) * 100}%` }} />
      </div>
      <div className="run-meta">
        <span>
          Block {seg.blockIndex + 1} of {plan.blocks.length}
        </span>
        <span>{fmtTime(totalSeconds - doneSeconds)} left in practice</span>
      </div>

      {compact ? (
        // One line instead of two; in the last 30 seconds the rotate call takes that line's place.
        rotateSoon ? (
          <div className="rotate-call">Get ready to rotate</div>
        ) : (
          <div className="run-now">Stations · Rotation {seg.rotation + 1} of {seg.rotations}</div>
        )
      ) : (
        <>
          <div className="run-now">{seg.kind === 'stations' ? `Rotation ${seg.rotation + 1} of ${seg.rotations}` : running ? 'Now' : elapsed > 0 ? 'Paused' : 'Up first'}</div>
          <div className="run-title">{seg.kind === 'stations' ? 'Stations' : seg.title}</div>
        </>
      )}
      <div className={`clock${running ? '' : ' paused'}`} role="timer" aria-live="off">
        {fmtTime(remaining)}
      </div>
      <div className="run-quiet">
        <button className="run-btn" onClick={addMinute} aria-label="Add one minute to this block">
          +1 min
        </button>
        {late && (
          <button className="run-btn" onClick={trim}>
            {compact ? `Trim (${Math.round(behind / 60)} min behind)` : 'Trim the rest to finish on time'}
          </button>
        )}
        {late && !compact && <span className="run-late">Running {Math.round(behind / 60)} min behind</span>}
        {trimmed && compact && (
          <>
            <span className="run-trimmed" role="status">
              Trimmed {trimmed.mins} min
            </span>
            <button className="run-btn" onClick={undoTrim}>
              Undo
            </button>
          </>
        )}
      </div>
      {rotateSoon && !compact && (
        <div className="rotate-call" style={{ marginTop: 10 }}>
          Get ready to rotate
        </div>
      )}
      {trimmed && !compact && (
        <p className="run-note" role="status">
          Trimmed {trimmed.mins} min from the drills ahead.{' '}
          <button className="link-btn" style={{ minHeight: 44 }} onClick={undoTrim}>
            Undo
          </button>
        </p>
      )}
      {note && (
        <p className="run-note" role="status">
          {note}
        </p>
      )}
      </div>

      <div className="run-body">
      {seg.kind === 'stations' && (
        <>
          <div className="run-stations">
            {seg.stations.map((_, g) => {
              const st = (g + seg.rotation) % seg.rotations
              const sd = drillFor(drillById(seg.stations[st]), team)
              const open = openGroup === g
              const stf = block?.staff?.[st]
              const watchGroup = stf?.near != null ? `Group ${((stf.near - seg.rotation) % seg.rotations + seg.rotations) % seg.rotations + 1}` : null
              const tag = staffTag(stf, watchGroup)
              const size = block?.groups?.[g]
              return (
                <div key={g} className="run-station">
                  <button className="run-station-head" onClick={() => setOpenGroup(open ? null : g)} aria-expanded={open}>
                    <b>{g + 1}</b>
                    <span className="run-station-name">
                      <span className="sr-only">Group {g + 1}: </span>
                      {sd?.name}
                      {(size != null || tag) && (
                        <small>
                          {size != null && <span>{`${size} ${size === 1 ? 'kid' : 'kids'}${tag ? '. ' : ''}`}</span>}
                          {tag && <span>{tag}</span>}
                        </small>
                      )}
                    </span>
                    <span className="run-station-toggle">{open ? 'Hide' : 'Details ›'}</span>
                  </button>
                  {open && sd && (
                    <div className="run-station-body">
                      <ul className="run-points">
                        {sd.steps.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                      {cuesFor(sd)[0] && (
                        <p className="run-cue">
                          <strong>Say:</strong> “{cuesFor(sd)[0].say}”
                        </p>
                      )}
                      <div className="run-picture">
                        <DrillPicture drill={sd} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {drill && cue && (
        <p className="run-cue">
          <strong>Say:</strong> “{cue.say}”
        </p>
      )}
      {drill && (
        <>
          <div className="run-quiet">
            <button className="run-btn" onClick={() => setShowHow(!showHow)} aria-expanded={showHow}>
              {showHow ? 'Hide how it works' : 'How it works'}
            </button>
            {hasPicture(drill.id) && (
              <button className="run-btn" onClick={() => setShowPic(!showPic)} aria-expanded={showPic}>
                {showPic ? 'Hide picture' : 'Show picture'}
              </button>
            )}
          </div>
          {showHow && (
            <div className="run-how">
              <ul className="run-points">
                {drill.steps.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
              {drill.points.length > 0 && (
                <>
                  <p className="run-sub">Coaching points</p>
                  <ul className="run-points">
                    {drill.points.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
          {showPic && (
            <div className="run-picture">
              <DrillPicture drill={drill} />
            </div>
          )}
        </>
      )}
      {seg.kind === 'huddle' && <p style={{ fontSize: 20, marginTop: 12 }}>{plan.closer}</p>}
      {seg.kind === 'huddle' && <HuddlePoints kind="practiceClose" team={team} focus={plan.focus} seed={plan.date ?? plan.id} />}
      {seg.kind === 'break' && <p style={{ fontSize: 20, marginTop: 12 }}>Water for everyone.</p>}
      {upFirst && (
        <p style={{ fontSize: 18, marginTop: 12 }}>
          <strong>Start with:</strong> {plan.opener}
        </p>
      )}
      {upFirst && (
        <div className="run-quiet">
          <button className="run-btn" onClick={() => setShowOpen(!showOpen)} aria-expanded={showOpen}>
            {showOpen ? 'Hide huddle points' : 'Huddle points'}
          </button>
        </div>
      )}
      {upFirst && showOpen && <HuddlePoints kind="practiceOpen" team={team} focus={plan.focus} seed={plan.date ?? plan.id} />}
      </div>

      <div className="run-foot">
      <div className="run-next">{next ? `Next: ${nextLine}` : nextLine}</div>
      <div className="run-controls">
        <button className="side" onClick={() => goToIndex(state.index - 1, running)} disabled={state.index === 0} aria-label="Previous block">
          Back
        </button>
        <button className="main" onClick={toggleRun}>
          {running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start'}
        </button>
        <button className="side" onClick={() => goToIndex(state.index + 1, running)} aria-label="Next block">
          {next ? 'Next' : 'Finish'}
        </button>
      </div>
      </div>
    </div>
  )
}
