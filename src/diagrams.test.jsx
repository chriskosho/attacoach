import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DIAGRAMS } from './data/diagrams.js'
import { POSE_SETS, POSES_FOR } from './data/poses.js'
import { VIDEO_QUERY, videoUrl } from './data/video.js'
import { drillById } from './data/drills.js'
import { sample, samplePos, stepAt, poseAt, loopOpacity } from './lib/diagram.js'
import { DrillText } from './components/DrillText.jsx'
import { drillFor } from './lib/sport.js'

describe('drill diagrams', () => {
  it.each(Object.entries(DIAGRAMS))('%s is well formed', (id, spec) => {
    const d = drillById(id)
    expect(d).toBeTruthy()
    expect(spec.at.length).toBe(d.steps.length)
    spec.at.forEach((s) => expect(s).toBeLessThan(spec.len))
    spec.actors.forEach((a) => {
      for (let i = 1; i < a.track.length; i++) expect(a.track[i][0]).toBeGreaterThanOrEqual(a.track[i - 1][0])
    })
    ;(spec.pops ?? []).forEach((p) => expect(spec.actors[p.at]).toBeTruthy())
    if (spec.poses) expect(POSE_SETS[spec.poses]).toBeTruthy()
  })
  it('video phrases and poses point at real drills', () => {
    Object.keys(VIDEO_QUERY).forEach((id) => expect(drillById(id), id).toBeTruthy())
    Object.keys(POSES_FOR).forEach((id) => expect(drillById(id), id).toBeTruthy())
    expect(videoUrl('pickle')).toMatch(/^https:\/\/www\.youtube\.com\/results\?search_query=/)
    expect(videoUrl('nope')).toBeNull()
  })
  it('helpers', () => {
    expect(sample([[0, 0, 0], [2, 10, 20]], 1)).toEqual([5, 10])
    expect(stepAt([1, 3], 0)).toBe(-1)
    expect(stepAt([1, 3], 3.5)).toBe(1)
    expect(poseAt([[0, 0], [2, 1]], 2.5)).toBe(1)
  })
  it('shows a diagram and video link for a pilot drill, nothing for a simple one', () => {
    const { unmount } = render(<DrillText drill={drillById('pickle')} />)
    expect(screen.getByRole('img', { name: /Diagram of/ })).toBeTruthy()
    expect(screen.getByText('Find a video on YouTube').getAttribute('target')).toBe('_blank')
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    unmount()
    const simple = Object.keys(VIDEO_QUERY).length
    expect(simple).toBeGreaterThan(0)
    const plain = render(<DrillText drill={drillById('soft-toss')} />)
    expect(plain.container.querySelector('.dg')).toBeNull()
  })
  it('the tee work diagram shows the swing positions under it', () => {
    const { container } = render(<DrillText drill={drillById('tee-work')} />)
    expect(container.querySelectorAll('.dg-strip .dg-pose')).toHaveLength(4)
    expect(container.textContent).not.toMatch(/undefined/)
  })
  it('shows pose cards for funnel grounders', () => {
    const { container } = render(<DrillText drill={drillById('funnel-grounders')} />)
    expect(container.querySelectorAll('.dg-strip .dg-pose')).toHaveLength(3)
  })
})

describe('drill pictures rollout', () => {
  const vis = (a, t) => !a.vis || (t >= a.vis[0] && t <= a.vis[1])

  it('has about 18 diagrams and 10 body-position strips, no more', () => {
    const n = Object.keys(DIAGRAMS).length
    expect(n).toBeGreaterThanOrEqual(14)
    expect(n).toBeLessThanOrEqual(20)
    expect(Object.keys(POSES_FOR).length).toBeGreaterThanOrEqual(10)
    Object.values(POSES_FOR).forEach((set) => expect(POSE_SETS[set], set).toBeTruthy())
  })

  it.each(Object.entries(DIAGRAMS))('%s always shows a ball and keeps people inside the picture', (id, spec) => {
    for (let t = 0; t <= spec.len; t += 0.1) {
      const balls = spec.actors.filter((a) => a.kind === 'ball' && vis(a, t))
      // Rounding first hits the ball at 1 second and lets the coach have it at the end; every other
      // diagram (Tee work and Front toss included) always shows a ball, on the tee or in a hand.
      if (id !== 'rounding-first') expect(balls.length, `${id} t=${t.toFixed(1)}`).toBeGreaterThan(0)
      for (const a of spec.actors) {
        if (a.kind === 'bat' || !vis(a, t)) continue
        const [x, y] = samplePos(a, t)
        expect(x > 4 && x < 296 && y > 4 && y < 296, `${id} ${a.label ?? a.kind} at t=${t.toFixed(1)}`).toBe(true)
      }
    }
  })

  it.each(Object.keys(DIAGRAMS))('%s matches the softball wording of the drill too', (id) => {
    const d = drillById(id)
    expect(drillFor(d, 'softball').steps.length).toBe(DIAGRAMS[id].at.length)
  })
})

describe('loops restart cleanly', () => {
  const vis = (a, t) => !a.vis || (t >= a.vis[0] && t <= a.vis[1] + 1e-9)
  // What the eye sees at time t: each visible dot or ball with its label and rounded position, sorted.
  // Players swapping places with identical dots look the same, so a rotation counts as a clean restart.
  const frame = (spec, t) =>
    spec.actors
      .filter((a) => a.kind !== 'bat' && vis(a, t))
      .map((a) => `${a.kind === 'ball' ? 'ball' : 'dot'}:${a.label ?? ''}@${samplePos(a, t).map(Math.round).join(',')}`)
      .sort()
  const near = (a, b) => (a.length === b.length && a.every((x, i) => x.split('@')[0] === b[i].split('@')[0] && Math.abs(Number(x.split('@')[1].split(',')[0]) - Number(b[i].split('@')[1].split(',')[0])) <= 1 && Math.abs(Number(x.split('@')[1].split(',')[1]) - Number(b[i].split('@')[1].split(',')[1])) <= 1))

  it.each(Object.entries(DIAGRAMS))('%s: the last frame matches the first, or it fades at the restart', (id, spec) => {
    if (spec.fade) {
      expect(loopOpacity(0, spec.len, true)).toBe(0)
      expect(loopOpacity(spec.len, spec.len, true)).toBe(0)
      expect(loopOpacity(spec.len / 2, spec.len, true)).toBe(1)
      return
    }
    expect(near(frame(spec, 0), frame(spec, spec.len)), `${id}: ${frame(spec, spec.len)} vs ${frame(spec, 0)}`).toBe(true)
  })

  it('only the two full-play diagrams use the fade', () => {
    expect(Object.entries(DIAGRAMS).filter(([, s]) => s.fade).map(([id]) => id).sort()).toEqual(['cutoffs-relays', 'rounding-first'])
    expect(loopOpacity(5, 10, false)).toBe(1)
  })

  it('pickle: nobody overlaps once the tag is made, and the out runner and next runner do not cross', () => {
    const spec = DIAGRAMS.pickle
    const people = spec.actors.filter((a) => a.kind !== 'bat' && a.kind !== 'ball')
    for (let t = 6.2; t <= spec.len; t += 0.05) {
      for (let i = 0; i < people.length; i++)
        for (let j = i + 1; j < people.length; j++) {
          const [x1, y1] = samplePos(people[i], t)
          const [x2, y2] = samplePos(people[j], t)
          expect(Math.hypot(x1 - x2, y1 - y2), `t=${t.toFixed(2)} dots ${i} and ${j}`).toBeGreaterThanOrEqual(24)
        }
    }
  })

  it('cutoffs and relays: no two people ever come closer than 18 px', () => {
    const spec = DIAGRAMS['cutoffs-relays']
    const people = spec.actors.filter((a) => a.kind !== 'bat' && a.kind !== 'ball')
    for (let t = 0; t <= spec.len + 1e-9; t += 0.05) {
      for (let i = 0; i < people.length; i++)
        for (let j = i + 1; j < people.length; j++) {
          const [x1, y1] = samplePos(people[i], t)
          const [x2, y2] = samplePos(people[j], t)
          expect(Math.hypot(x1 - x2, y1 - y2), `t=${t.toFixed(2)} dots ${i} and ${j}`).toBeGreaterThanOrEqual(18)
        }
    }
  })

  it('tee work and front toss keep a ball in view the whole loop, on the tee or in the coach’s hand', () => {
    for (const id of ['tee-work', 'front-toss']) {
      const spec = DIAGRAMS[id]
      for (let t = 0; t <= spec.len + 1e-9; t += 0.05) expect(spec.actors.some((a) => a.kind === 'ball' && vis(a, t)), `${id} t=${t.toFixed(2)}`).toBe(true)
    }
  })

  it('the tee is never empty for more than a moment between swings', () => {
    const spec = DIAGRAMS['tee-work']
    const TEE = [150, 176]
    const hasTeeBall = (t) => spec.actors.some((a) => a.kind === 'ball' && vis(a, t) && Math.hypot(...samplePos(a, t).map((v, i) => v - TEE[i])) < 2)
    let empty = 0
    let worst = 0
    for (let t = 0; t <= spec.len; t += 0.05) {
      empty = hasTeeBall(t) ? 0 : empty + 0.05
      worst = Math.max(worst, empty)
    }
    // About a second: the hit, the coach bringing the next ball, and placing it.
    expect(worst).toBeLessThanOrEqual(1.5)
  })
})
