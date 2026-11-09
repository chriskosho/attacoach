import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db.js'
import { drillById } from '../data/drills.js'
import { blockTitle } from '../lib/share.js'
import { go, store } from '../lib/route.js'

// Turns a plan into timed segments. Each station rotation is its own segment.
export function segmentsFor(plan) {
  const segs = []
  plan.blocks.forEach((b, bi) => {
    if (b.kind === 'stations') {
      const n = b.stations.length
      for (let r = 0; r < n; r++) {
        segs.push({ key: `${b.id}:${r}`, blockIndex: bi, kind: 'stations', title: 'Stations', seconds: b.stationMinutes * 60, stations: b.stations, rotation: r, rotations: n })
      }
    } else {
      segs.push({ key: b.id, blockIndex: bi, kind: b.kind, title: blockTitle(b), seconds: b.minutes * 60, drillId: b.drillId })
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
  const segs = useMemo(() => segmentsFor(plan), [plan])
  const storeKey = `run:${plan.id}`
  const [state, setState] = useState(() => {
    const saved = store.get(storeKey)
    if (saved && saved.index < segs.length) return saved
    return { index: 0, startedAt: null, elapsed: 0 }
  })
  const [now, setNow] = useState(Date.now())
  const [finished, setFinished] = useState(false)
  const running = state.startedAt != null
  const seg = segs[state.index]
  const elapsed = state.elapsed + (running ? (now - state.startedAt) / 1000 : 0)
  const remaining = seg ? seg.seconds - elapsed : 0
  const advanced = useRef(false)
  const [showSteps, setShowSteps] = useState(team.experience === 'new')

  useWakeLock(running)

  useEffect(() => {
    store.set(storeKey, finished ? null : state)
  }, [state, finished, storeKey])

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [running])

  const goToIndex = useCallback(
    (i, keepRunning) => {
      if (i >= segs.length) {
        setFinished(true)
        setState({ index: segs.length - 1, startedAt: null, elapsed: 0 })
        return
      }
      const t = Date.now()
      setNow(t)
      setState({ index: Math.max(0, i), startedAt: keepRunning ? t : null, elapsed: 0 })
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
    beep(state.index + 1 < segs.length && segs[state.index + 1].kind === 'stations' && seg.kind === 'stations' ? 3 : 2)
    goToIndex(state.index + 1, true)
  }, [running, remaining, state.index, segs, seg, goToIndex])

  const toggleRun = () => {
    unlockAudio()
    const t = Date.now()
    setNow(t)
    if (running) setState((s) => ({ ...s, startedAt: null, elapsed: s.elapsed + (t - s.startedAt) / 1000 }))
    else setState((s) => ({ ...s, startedAt: t }))
  }

  const exit = () => {
    if (running && !window.confirm('Leave the timer? Practice time will pause here.')) return
    if (running) setState((s) => ({ ...s, startedAt: null, elapsed: s.elapsed + (Date.now() - s.startedAt) / 1000 }))
    go(`plan/${plan.id}`)
  }

  const totalSeconds = segs.reduce((s, x) => s + x.seconds, 0)
  const doneSeconds = segs.slice(0, state.index).reduce((s, x) => s + x.seconds, 0) + Math.min(elapsed, seg?.seconds ?? 0)
  const next = segs[state.index + 1]
  const drill = seg?.drillId ? drillById(seg.drillId) : null

  if (finished) {
    return (
      <div className="run" role="main">
        <div className="run-top">
          <span className="spacer" />
          <button className="run-btn" onClick={() => go(`plan/${plan.id}`)}>
            Done
          </button>
        </div>
        <div className="run-now">Practice complete</div>
        <div className="run-title">Great work, Coach.</div>
        <p style={{ fontSize: 20, marginTop: 16 }}>{plan.closer}</p>
        <div className="run-controls" style={{ gridTemplateColumns: '1fr' }}>
          <button className="main" onClick={() => go('today')}>
            Plan the next practice
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

      {seg.kind === 'stations' && (
        <>
          <div className="run-stations">
            {seg.stations.map((_, g) => {
              const st = (g + seg.rotation) % seg.rotations
              return (
                <div key={g}>
                  <b>{g + 1}</b>
                  <span>
                    Group {g + 1}: Station {st + 1}, {drillById(seg.stations[st])?.name}
                  </span>
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
            {(showSteps ? drill.steps : drill.points).map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
          <button className="run-btn" style={{ alignSelf: 'flex-start', marginTop: 12 }} onClick={() => setShowSteps(!showSteps)}>
            {showSteps ? 'Show coaching points' : 'Show how it works'}
          </button>
        </>
      )}
      {seg.kind === 'huddle' && <p style={{ fontSize: 20, marginTop: 12 }}>{plan.closer}</p>}
      {seg.kind === 'break' && <p style={{ fontSize: 20, marginTop: 12 }}>Water for everyone.</p>}
      {state.index === 0 && (
        <p style={{ fontSize: 18, marginTop: 12 }}>
          <strong>Start with:</strong> {plan.opener}
        </p>
      )}

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
