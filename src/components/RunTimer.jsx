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
  const [showSteps, setShowSteps] = useState(team.experience === 'new')
  const [showAll, setShowAll] = useState(false)

  useWakeLock(running)

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
    setShowAll(false)
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
        setState((s) => ({ ...s, index: segs.length - 1, startedAt: null, elapsed: 0 }))
        return
      }
      const t = Date.now()
      setNow(t)
      setState((s) => ({ ...s, index: Math.max(0, i), startedAt: keepRunning ? t : null, elapsed: 0 }))
    },
    [segs.length],
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
  // At most three lines to read at first; the rest sit behind More.
  const allLines = drill ? (showSteps ? drill.steps : drill.points) : []
  const shown = showAll ? allLines : allLines.slice(0, 3)
  const more = allLines.length - 3 > 0 ? allLines.length - 3 : 0

  const planned = baseSegs.reduce((n, x) => n + x.seconds, 0)
  const behind = behindSeconds({ startedWall: state.startedWall, now, totalNow: totalSeconds, doneNow: doneSeconds, totalPlanned: planned })
  const trim = () => {
    const t = trimSegments(segs, seg.blockIndex, behind)
    if (!t.cut) {
      setNote('Nothing left to trim. Water breaks and the huddle stay as planned.')
      return
    }
    setState((s) => ({ ...s, adj: { ...s.adj, ...t.seconds } }))
    const mins = Math.max(1, Math.round(t.cut / 60))
    setNote(`Trimmed ${mins} min from the drills ahead${t.capped ? ' (each keeps at least 60% of its time)' : ''}. Water breaks and the closing huddle are unchanged.`)
  }

  if (finished) {
    return (
      <div className="run" role="main">
        <div className="run-now">Practice complete</div>
        <div className="run-title">Great work, Coach.</div>
        <p style={{ fontSize: 20, marginTop: 16 }}>{plan.closer}</p>
        <PlanFeedback team={team} plan={plan} variant="run" />
        <div className="run-controls finish">
          <button className="main" onClick={() => go(`debrief/practice/${plan.id}`)}>
            2-minute recap
          </button>
          <button className="side" onClick={() => go(`plan/${plan.id}`)}>
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="run" role="main" aria-label="Practice timer">
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

      <div className="run-now">{seg.kind === 'stations' ? `Rotation ${seg.rotation + 1} of ${seg.rotations}` : running ? 'Now' : elapsed > 0 ? 'Paused' : 'Up first'}</div>
      <div className="run-title">{seg.kind === 'stations' ? 'Stations' : seg.title}</div>
      <div className={`clock${running ? '' : ' paused'}`} role="timer" aria-live="off">
        {fmtTime(remaining)}
      </div>
      <div className="run-quiet">
        <button className="run-btn" onClick={addMinute} aria-label="Add one minute to this block">
          +1 min
        </button>
        {behind > 180 && !note.startsWith('Trimmed') && (
          <span className="run-late">
            Running {Math.round(behind / 60)} min behind
            <button className="link-btn" onClick={trim}>
              Trim the rest to finish on time
            </button>
          </span>
        )}
      </div>
      {note && (
        <p className="run-note" role="status">
          {note}
        </p>
      )}

      {seg.kind === 'stations' && (
        <>
          <div className="run-stations">
            {seg.stations.map((_, g) => {
              const st = (g + seg.rotation) % seg.rotations
              const sd = drillFor(drillById(seg.stations[st]), team)
              const open = openGroup === g
              const tag = staffTag(block?.staff?.[st])
              return (
                <div key={g} className="run-station">
                  <button className="run-station-head" onClick={() => setOpenGroup(open ? null : g)} aria-expanded={open}>
                    <b>{g + 1}</b>
                    <span className="run-station-name">
                      Group {g + 1} → {sd?.name}
                      {tag && <small>{tag}</small>}
                    </span>
                    <span className="run-station-toggle">{open ? 'Hide' : 'Open'}</span>
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
          {seg.rotation + 1 < seg.rotations && remaining <= 30 && <div className="rotate-call" style={{ marginTop: 10 }}>Get ready to rotate</div>}
        </>
      )}

      {drill && (
        <>
          <ul className="run-points">
            {shown.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
          <div className="run-quiet">
            {more > 0 && (
              <button className="run-btn" onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>
                {showAll ? 'Fewer' : `More (${more})`}
              </button>
            )}
            <button className="run-btn" onClick={() => { setShowSteps(!showSteps); setShowAll(false) }}>
              {showSteps ? 'Show coaching points' : 'Show how it works'}
            </button>
            {hasPicture(drill.id) && (
              <button className="run-btn" onClick={() => setShowPic(!showPic)} aria-expanded={showPic}>
                {showPic ? 'Hide picture' : 'Show picture'}
              </button>
            )}
          </div>
          {showPic && (
            <div className="run-picture">
              <DrillPicture drill={drill} />
            </div>
          )}
        </>
      )}
      {drill && cuesFor(drill)[0] && (
        <p className="run-cue">
          <strong>Say:</strong> “{cuesFor(drill)[0].say}”
        </p>
      )}
      {seg.kind === 'huddle' && <p style={{ fontSize: 20, marginTop: 12 }}>{plan.closer}</p>}
      {seg.kind === 'huddle' && <HuddlePoints kind="practiceClose" team={team} focus={plan.focus} seed={plan.date ?? plan.id} />}
      {seg.kind === 'break' && <p style={{ fontSize: 20, marginTop: 12 }}>Water for everyone.</p>}
      {state.index === 0 && (
        <p style={{ fontSize: 18, marginTop: 12 }}>
          <strong>Start with:</strong> {plan.opener}
        </p>
      )}
      {state.index === 0 && (
        <div className="run-quiet">
          <button className="run-btn" onClick={() => setShowOpen(!showOpen)} aria-expanded={showOpen}>
            {showOpen ? 'Hide huddle points' : 'Huddle points'}
          </button>
        </div>
      )}
      {state.index === 0 && showOpen && <HuddlePoints kind="practiceOpen" team={team} focus={plan.focus} seed={plan.date ?? plan.id} />}

      <div className="run-next">
        {next ? (
          <>
            Next: {next.kind === 'stations' && next.rotation > 0 ? `rotate (rotation ${next.rotation + 1})` : next.kind === 'stations' ? 'Stations' : next.title}, {Math.round(next.seconds / 60)} min
          </>
        ) : (
          'Last block'
        )}
      </div>
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
  )
}
