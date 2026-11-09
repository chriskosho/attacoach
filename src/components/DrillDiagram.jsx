import { useEffect, useRef, useState } from 'react'
import { DIAGRAMS } from '../data/diagrams.js'
import { BG } from '../data/diagramBg.js'
import { POSE_SETS, POSES_FOR } from '../data/poses.js'
import { sample, smoothPath, stepAt, poseAt, trailPoints } from '../lib/diagram.js'
import { videoUrl } from '../data/video.js'

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function Actor({ a, t }) {
  if (a.vis && (t < a.vis[0] || t > a.vis[1])) return null
  if (a.kind === 'bat') return null
  const [x, y] = sample(a.track, t)
  if (a.kind === 'ball') return <circle cx={x} cy={y} r="4" className="dg-ball" />
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="9" fill={a.fill} className="dg-body" />
      {a.label && (
        <text y="3.5" textAnchor="middle" className="dg-who">
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
  const still = reduced()
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
  const trail = spec.trail ? trailPoints(spec.actors[spec.trail.actor], spec.trail.from, spec.trail.to) : null
  const cur = stepAt(spec.at, t)
  const pose = spec.poses ? POSE_SETS[spec.poses][poseAt(spec.poseAt, t)] : null

  return (
    <div className="dg" ref={ref}>
      <svg viewBox="0 0 300 300" role="img" aria-label={`Diagram of ${drill.name} from above`} className="dg-svg">
        <g dangerouslySetInnerHTML={{ __html: BG[spec.bg] + (spec.extras ?? '') }} />
        {trail && <path d={smoothPath(trail)} className="dg-trail" />}
        {spec.actors.map((a, i) => (
          <Actor key={i} a={a} t={t} />
        ))}
        {batPos && <line x1={batPos.p[0]} y1={batPos.p[1]} x2={batPos.p[0] + 22 * Math.cos((batPos.ang * Math.PI) / 180)} y2={batPos.p[1] + 22 * Math.sin((batPos.ang * Math.PI) / 180)} className="dg-bat" />}
        {(spec.labels ?? []).filter((l) => t >= l.t0 && t <= l.t1).map((l) => (
          <text key={l.text} x={l.x} y={l.y} className="dg-lab dg-big">
            {l.text}
          </text>
        ))}
        {(spec.pops ?? []).filter((p) => t >= p.t0 && t <= p.t1).map((p) => {
          const [x, y] = sample(spec.actors[p.at].track, t)
          const w = p.text.length * 5.6 + 12
          const px = Math.min(Math.max(x, w / 2 + 2), 298 - w / 2)
          return (
            <g key={p.text} transform={`translate(${px} ${y - 24})`}>
              <rect x={-w / 2} y="-9" width={w} height="16" rx="8" className="dg-pop" />
              <text y="3" textAnchor="middle" className="dg-poptext">
                {p.text}
              </text>
            </g>
          )
        })}
      </svg>
      {pose && (
        <div className="dg-pose" aria-hidden="true">
          <PoseFigure pose={pose} />
          <span>{pose.n}</span>
        </div>
      )}
      <div className="dg-controls no-print">
        <button type="button" className="btn small" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <input type="range" min="0" max={spec.len} step="0.05" value={t} aria-label="Move through the drill" onChange={(e) => { setPlaying(false); setT(Number(e.target.value)) }} />
        <button type="button" className="btn small" aria-pressed={slow} onClick={() => setSlow((s) => !s)}>
          ½×
        </button>
      </div>
      {still && <p className="small muted no-print">Motion is off on this device. Drag the slider to step through.</p>}
      <p className="small muted dg-now">{cur >= 0 ? `Step ${cur + 1}: ${drill.steps[cur]}` : 'Press Play to watch the drill.'}</p>
      <p className="small muted">Drawn from above, not to scale.</p>
    </div>
  )
}

function PoseFigure({ pose }) {
  const j = pose.j
  const L = (a, b) => <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
  return (
    <svg viewBox="0 0 80 92" className="dg-fig" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none">
      <circle cx={j.head[0]} cy={j.head[1]} r="6" />
      {L(j.neck, j.hip)}
      {L(j.hip, j.k1)}
      {L(j.k1, j.f1)}
      {L(j.hip, j.k2)}
      {L(j.k2, j.f2)}
      {L(j.neck, j.hand)}
      {j.tip && L(j.hand, j.tip)}
      {j.glove && <circle cx={j.glove[0]} cy={j.glove[1]} r="5" />}
    </svg>
  )
}

// A strip of key body positions for drills with no moving diagram.
export function PoseStrip({ set }) {
  return (
    <div className="dg-strip" aria-hidden="true">
      {POSE_SETS[set].map((p) => (
        <div key={p.n} className="dg-pose">
          <PoseFigure pose={p} />
          <span>{p.n}</span>
        </div>
      ))}
    </div>
  )
}

export function VideoLink({ id }) {
  const url = videoUrl(id)
  if (!url) return null
  return (
    <p className="no-print">
      <a className="btn small" href={url} target="_blank" rel="noopener noreferrer">
        Find a video on YouTube
      </a>
    </p>
  )
}

// Everything visual for a drill, or nothing when the words are enough.
export function DrillVisual({ drill, compact = false }) {
  const spec = DIAGRAMS[drill.id]
  const set = POSES_FOR[drill.id]
  return (
    <>
      {spec && !compact && <DrillDiagram drill={drill} spec={spec} />}
      {!spec && set && !compact && <PoseStrip set={set} />}
      <VideoLink id={drill.id} />
    </>
  )
}
