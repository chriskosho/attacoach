import { useEffect, useRef, useState } from 'react'
import { DIAGRAMS } from '../data/diagrams.js'
import { BG } from '../data/diagramBg.js'
import { POSE_SETS, POSES_FOR } from '../data/poses.js'
import { sample, samplePos, smoothPath, stepAt, poseAt, trailPoints, loopOpacity } from '../lib/diagram.js'
import { videoUrl } from '../data/video.js'

function Actor({ a, t }) {
  if (a.vis && (t < a.vis[0] || t > a.vis[1])) return null
  if (a.kind === 'bat') return null
  const [x, y] = samplePos(a, t)
  if (a.kind === 'ball') return <circle cx={x} cy={y} r="4" className="dg-ball" />
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="9" fill={a.fill} className="dg-body" />
      {a.label && (
        <text y="3.5" textAnchor="middle" className={`dg-who${a.label.length > 1 ? ' two' : ''}`}>
          {a.label}
        </text>
      )}
    </g>
  )
}

export function DrillDiagram({ drill, spec }) {
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [slow, setSlow] = useState(false)
  const ref = useRef(null)
  const first = spec.actors.find((a) => a.kind === 'kid')

  useEffect(() => {
    if (!playing) return undefined
    let last = performance.now()
    let raf
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      setT((x) => (x + dt * (slow ? 0.5 : 1)) % spec.len)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, slow, spec.len])

  // Stop moving when scrolled off screen.
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([e]) => !e.isIntersecting && setPlaying(false))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const bat = spec.actors.find((a) => a.kind === 'bat')
  const batPos = bat && first && t >= bat.vis[0] && t <= bat.vis[1] ? { p: sample(first.track, t), ang: sample(bat.track, t)[0] } : null
  const tr = spec.trail
  const trail = tr ? trailPoints(spec.actors[tr.actor], tr.from, tr.to) : null
  const done = tr && t > tr.from ? trailPoints(spec.actors[tr.actor], tr.from, Math.min(t, tr.to)) : null
  if (done && t < tr.to) done.push(samplePos(spec.actors[tr.actor], t))
  const cur = stepAt(spec.at, t)
  const pose = spec.poses && t > 0 ? poseAt(spec.poseAt, t) : null
  // Only while playing: a paused or scrubbed picture always shows everything.
  const opacity = playing ? loopOpacity(t, spec.len, spec.fade) : 1

  return (
    <div className="dg" ref={ref}>
      <svg viewBox="0 0 300 300" role="img" aria-label={`Diagram of ${drill.name} from above`} className="dg-svg">
        <g dangerouslySetInnerHTML={{ __html: BG[spec.bg] + (spec.extras ?? '') }} />
        <g style={opacity < 1 ? { opacity } : undefined}>
        {(spec.guides ?? []).filter((g) => t >= g.t0 && t <= g.t1).map((g, i) => (
          <line key={i} x1={g.from[0]} y1={g.from[1]} x2={g.to[0]} y2={g.to[1]} className="dg-guide" />
        ))}
        {trail && <path d={smoothPath(trail)} className="dg-trail" />}
        {done && done.length > 1 && <path d={smoothPath(done)} className="dg-trail dg-done" />}
        {/* players first, then the bat and balls on top so a held ball is never hidden */}
        {spec.actors.map((a, i) => (a.kind === 'ball' ? null : <Actor key={i} a={a} t={t} />))}
        {batPos && <line x1={batPos.p[0]} y1={batPos.p[1]} x2={batPos.p[0] + 22 * Math.cos((batPos.ang * Math.PI) / 180)} y2={batPos.p[1] + 22 * Math.sin((batPos.ang * Math.PI) / 180)} className="dg-bat" />}
        {spec.actors.map((a, i) => (a.kind === 'ball' ? <Actor key={i} a={a} t={t} /> : null))}
        {(spec.labels ?? []).filter((l) => t >= l.t0 && t <= l.t1).map((l) => (
          <text key={l.text} x={l.x} y={l.y} className="dg-lab dg-big">
            {l.text}
          </text>
        ))}
        {(spec.pops ?? []).filter((p) => t >= p.t0 && t <= p.t1).map((p) => {
          const [x, y] = samplePos(spec.actors[p.at], t)
          const w = p.text.length * 5.6 + 12
          const px = Math.min(Math.max(x, w / 2 + 2), 298 - w / 2)
          return (
            <g key={p.text} transform={`translate(${px} ${p.below ? y + 25 : y - 24})`}>
              <rect x={-w / 2} y="-9" width={w} height="16" rx="8" className="dg-pop" />
              <text y="3" textAnchor="middle" className="dg-poptext">
                {p.text}
              </text>
            </g>
          )
        })}
        </g>
      </svg>
      {spec.poses && <PoseStrip set={spec.poses} active={pose} />}
      <div className="dg-controls no-print">
        <button type="button" className="btn quiet small" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <input type="range" min="0" max={spec.len} step="0.05" value={t} aria-label="Move through the drill" onChange={(e) => { setPlaying(false); setT(Number(e.target.value)) }} />
        <button type="button" className="btn quiet small" aria-pressed={slow} aria-label="Half speed" onClick={() => setSlow((s) => !s)}>
          ½×
        </button>
      </div>
      <p className="small muted dg-now">{cur >= 0 ? `Step ${cur + 1}: ${drill.steps[cur]}` : 'Press Play to watch the drill.'}</p>
      <p className="small muted">Drawn from above, not to scale.</p>
    </div>
  )
}

function PoseFigure({ pose }) {
  const j = pose.j
  const L = (a, b) => <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
  return (
    <svg viewBox="-2 -8 84 102" className="dg-fig" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none">
      {j.tip && <line x1={j.hand[0]} y1={j.hand[1]} x2={j.tip[0]} y2={j.tip[1]} strokeWidth="4.5" className="dg-fig-bat" />}
      <circle cx={j.head[0]} cy={j.head[1]} r="6" className="dg-head" />
      {L(j.neck, j.hip)}
      {L(j.hip, j.k1)}
      {L(j.k1, j.f1)}
      {L(j.hip, j.k2)}
      {L(j.k2, j.f2)}
      {j.elbow ? (
        <>
          {L(j.neck, j.elbow)}
          {L(j.elbow, j.hand)}
        </>
      ) : (
        L(j.neck, j.hand)
      )}
      {/* An optional second arm: the glove arm, or the top hand on a bunt. */}
      {j.elbow2 && (
        <>
          {L(j.neck, j.elbow2)}
          {L(j.elbow2, j.hand2)}
        </>
      )}
      {j.glove && <path d={`M${j.glove[0] - 6} ${j.glove[1] - 4} q6 10 12 0`} strokeWidth="3.5" />}
      {j.ball && <circle cx={j.ball[0]} cy={j.ball[1]} r="3" fill="#fff" stroke="#c33" strokeWidth="1.2" />}
    </svg>
  )
}

// A strip of key body positions for drills with no moving diagram.
export function PoseStrip({ set, active = null }) {
  return (
    <div className="dg-strip" aria-hidden="true">
      {POSE_SETS[set].map((p, i) => (
        <div key={p.n} className={`dg-pose${active === i ? ' on' : ''}`}>
          <PoseFigure pose={p} />
          <span>{p.n}</span>
        </div>
      ))}
    </div>
  )
}

export function VideoLink({ id, sport = 'baseball' }) {
  const url = videoUrl(id, sport)
  if (!url) return null
  return (
    <p className="no-print">
      <a className="btn quiet small" href={url} target="_blank" rel="noopener noreferrer">
        Find a video on YouTube
      </a>
    </p>
  )
}

// Everything visual for a drill, or nothing when the words are enough.
export function DrillVisual({ drill, compact = false, sport = 'baseball' }) {
  const spec = DIAGRAMS[drill.id]
  const set = POSES_FOR[drill.id]
  return (
    <>
      {spec && !compact && <DrillDiagram drill={drill} spec={spec} />}
      {!spec && set && !compact && <PoseStrip set={set} />}
      <VideoLink id={drill.id} sport={sport} />
    </>
  )
}

// Whether a drill has a diagram or body-position pictures to show.
export const hasPicture = (drillId) => Boolean(DIAGRAMS[drillId] || POSES_FOR[drillId])

// Just the picture (no video link), for places that should stay on the page, like the practice timer.
export function DrillPicture({ drill }) {
  const spec = DIAGRAMS[drill.id]
  const set = POSES_FOR[drill.id]
  if (spec) return <DrillDiagram drill={drill} spec={spec} />
  if (set) return <PoseStrip set={set} />
  return null
}
