import { describe, it, expect } from 'vitest'
import { catchUp, trimSegments, behindSeconds } from './lib/runMath.js'

describe('catching up after the screen was off', () => {
  const secs = [300, 120, 600, 180]

  it('stays put when the block still has time', () => {
    expect(catchUp(secs, 0, 100, 50)).toEqual({ index: 0, elapsed: 150, done: false, moved: 0 })
  })

  it('moves one block and keeps the extra time', () => {
    // 200 s left in block 0, away 260 s: lands 60 s into block 1.
    expect(catchUp(secs, 0, 100, 260)).toEqual({ index: 1, elapsed: 60, done: false, moved: 1 })
  })

  it('moves through several blocks and lands on the right one', () => {
    // 300 + 120 = 420 s covers blocks 0 and 1, then 100 s into block 2.
    expect(catchUp(secs, 0, 0, 520)).toEqual({ index: 2, elapsed: 100, done: false, moved: 2 })
    expect(catchUp(secs, 1, 20, 100 + 600)).toEqual({ index: 3, elapsed: 0, done: false, moved: 2 })
  })

  it('finishes when the time runs past the end', () => {
    expect(catchUp(secs, 2, 0, 5000)).toEqual({ index: 3, elapsed: 0, done: true, moved: 2 })
  })

  it('treats a negative gap as none', () => {
    expect(catchUp(secs, 1, 10, -5).index).toBe(1)
  })
})

describe('running late', () => {
  const seg = (key, blockIndex, kind, base, seconds = base) => ({ key, blockIndex, kind, base, seconds })
  const segs = [
    seg('a', 0, 'drill', 600),
    seg('w', 1, 'break', 180),
    seg('b', 2, 'drill', 600),
    seg('c:0', 3, 'stations', 300),
    seg('c:1', 3, 'stations', 300),
    seg('h', 4, 'huddle', 240),
  ]

  it('measures how far behind from the clock, pauses and skipped time', () => {
    const base = { startedWall: 0, totalPlanned: 1000, totalNow: 1000 }
    expect(behindSeconds({ ...base, now: 700_000, doneNow: 700 })).toBe(0)
    expect(behindSeconds({ ...base, now: 900_000, doneNow: 700 })).toBe(200)
    // Skipping ahead gives the time back; a +1 minute makes it later.
    expect(behindSeconds({ ...base, now: 900_000, doneNow: 900 })).toBe(0)
    expect(behindSeconds({ ...base, totalNow: 1060, now: 700_000, doneNow: 700 })).toBe(60)
    expect(behindSeconds({ startedWall: null, now: 5, totalNow: 1, doneNow: 0, totalPlanned: 1 })).toBe(0)
    // A practice left alone for a day is not "behind".
    expect(behindSeconds({ ...base, now: 86_400_000, doneNow: 0 })).toBe(0)
  })

  it('shortens only the drills still ahead, in proportion', () => {
    const t = trimSegments(segs, 0, 180)
    expect(Object.keys(t.seconds).sort()).toEqual(['b', 'c:0', 'c:1'])
    expect(t.cut).toBe(180)
    expect(t.capped).toBe(false)
    expect(t.seconds['b']).toBeLessThan(600)
    // Both rotations of a station block give up the same amount.
    expect(t.seconds['c:0']).toBe(t.seconds['c:1'])
    expect(600 - t.seconds['b'] + (300 - t.seconds['c:0']) * 2).toBe(180)
  })

  it('never touches water breaks, the closing huddle or the block being run', () => {
    const t = trimSegments(segs, 2, 1000)
    expect(t.seconds).not.toHaveProperty('a')
    expect(t.seconds).not.toHaveProperty('w')
    expect(t.seconds).not.toHaveProperty('h')
    expect(t.seconds).not.toHaveProperty('b')
    expect(Object.keys(t.seconds).sort()).toEqual(['c:0', 'c:1'])
  })

  it('never goes below 60% of a drill, and says when it could not win everything back', () => {
    const t = trimSegments(segs, 0, 5000)
    expect(t.capped).toBe(true)
    expect(t.seconds['b']).toBe(360)
    expect(t.seconds['c:0']).toBe(180)
    expect(t.cut).toBe(240 + 120 + 120)
  })

  it('counts the 60% from the planned length even after an earlier trim', () => {
    const trimmed = segs.map((s) => (s.key === 'b' ? { ...s, seconds: 400 } : s))
    const t = trimSegments(trimmed, 0, 5000)
    expect(t.seconds['b']).toBe(360)
  })

  it('does nothing when there is nothing left to trim', () => {
    const t = trimSegments(segs, 4, 300)
    expect(t).toMatchObject({ cut: 0, blocks: 0, capped: true })
    expect(Object.keys(t.seconds)).toHaveLength(0)
  })
})
