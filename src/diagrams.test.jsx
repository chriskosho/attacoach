import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DIAGRAMS } from './data/diagrams.js'
import { POSE_SETS, POSES_FOR } from './data/poses.js'
import { VIDEO_QUERY, videoUrl } from './data/video.js'
import { drillById } from './data/drills.js'
import { sample, samplePos, stepAt, poseAt } from './lib/diagram.js'
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
      // The first three diagrams hide the ball between swings or reps on purpose.
      if (!['rounding-first', 'tee-work', 'front-toss'].includes(id)) expect(balls.length, `${id} t=${t.toFixed(1)}`).toBeGreaterThan(0)
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
