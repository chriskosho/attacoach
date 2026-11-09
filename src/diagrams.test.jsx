import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DIAGRAMS } from './data/diagrams.js'
import { POSE_SETS, POSES_FOR } from './data/poses.js'
import { VIDEO_QUERY, videoUrl } from './data/video.js'
import { drillById } from './data/drills.js'
import { sample, stepAt, poseAt } from './lib/diagram.js'
import { DrillText } from './components/DrillText.jsx'

describe('drill diagrams', () => {
  it.each(Object.entries(DIAGRAMS))('%s is well formed', (id, spec) => {
    const d = drillById(id)
    expect(d).toBeTruthy()
    expect(spec.at.length).toBeLessThanOrEqual(d.steps.length + 1)
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
  it('shows pose cards for funnel grounders', () => {
    const { container } = render(<DrillText drill={drillById('funnel-grounders')} />)
    expect(container.querySelectorAll('.dg-strip .dg-pose')).toHaveLength(3)
  })
})
