// The practice timer: station rows, pictures, running late, catching up and the finish screen.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { db, saveTeam, clearEverything } from './lib/db.js'
import { defaultRules } from './data/constants.js'
import { DRILLS } from './data/drills.js'
import { DIAGRAMS } from './data/diagrams.js'
import { hasPicture } from './components/DrillDiagram.jsx'
import { cuesFor } from './data/coaching.js'

const withPic = DRILLS.find((d) => DIAGRAMS[d.id] && d.steps?.length >= 2)
const noPic = DRILLS.find((d) => !hasPicture(d.id) && d.steps?.length >= 2 && d.category !== 'warmup')
const other = DRILLS.filter((d) => d.id !== withPic.id && d.id !== noPic.id && !hasPicture(d.id))[3]

const team = { name: 'Blue Jays', division: '10U', experience: 'some', needs: ['grounders'], rules: defaultRules('10U') }

const plan = (over = {}) => ({
  id: 'p1',
  date: '2026-11-05',
  createdAt: '2026-11-05T10:00:00Z',
  focus: ['grounders'],
  opener: 'Welcome in.',
  closer: 'Good work today.',
  coachRole: 'run',
  blocks: [
    { id: 'a', kind: 'drill', drillId: other.id, minutes: 10 },
    { id: 'b', kind: 'drill', drillId: other.id, minutes: 10 },
    { id: 'w', kind: 'break', minutes: 2 },
    { id: 'c', kind: 'drill', drillId: other.id, minutes: 10 },
    { id: 'h', kind: 'huddle', minutes: 4 },
  ],
  ...over,
})

const stationPlan = () =>
  plan({
    blocks: [
      {
        id: 's',
        kind: 'stations',
        stations: [withPic.id, noPic.id],
        stationMinutes: 5,
        groups: [4, 4],
        staff: [{ type: 'run', who: 'coach' }, { type: 'kids' }],
      },
      { id: 'h', kind: 'huddle', minutes: 4 },
    ],
  })

async function open(p) {
  const t = await saveTeam(team)
  await db.plans.put({ ...p, teamId: t.id })
  window.location.hash = '#/run/p1'
  render(<App />)
  await screen.findByRole('timer')
}

beforeEach(async () => {
  cleanup()
  await clearEverything()
  window.location.hash = ''
  try { window.localStorage.clear() } catch { /* ignore */ }
})

describe('station rotations in the timer', () => {
  it('shows each group with its station and who runs it', async () => {
    await open(stationPlan())
    expect(screen.getByRole('button', { name: new RegExp(`Group 1 \\(4 kids\\) → ${withPic.name}`) })).toBeTruthy()
    expect(screen.getByRole('button', { name: new RegExp(`Group 2 \\(4 kids\\) → ${noPic.name}`) })).toBeTruthy()
    expect(screen.getByText('You run it')).toBeTruthy()
    expect(screen.getByText('Kids run it')).toBeTruthy()
  })

  it('opens a station in place with its steps, and the clock stays', async () => {
    const user = userEvent.setup()
    await open(stationPlan())
    const row = screen.getByRole('button', { name: new RegExp(`Group 1 \\(4 kids\\) → ${withPic.name}`) })
    expect(row.getAttribute('aria-expanded')).toBe('false')
    await user.click(row)
    expect(row.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText(withPic.steps[0])).toBeTruthy()
    expect(document.querySelector('.run-picture svg')).toBeTruthy()
    expect(screen.getByRole('timer').textContent).toBe('5:00')
    expect(window.location.hash).toBe('#/run/p1')
    await user.click(row)
    expect(screen.queryByText(withPic.steps[0])).toBe(null)
  })
})

describe('single drills and the first screen', () => {
  it('offers a picture on request only when the drill has one', async () => {
    const user = userEvent.setup()
    await open(plan({ blocks: [{ id: 'a', kind: 'drill', drillId: withPic.id, minutes: 10 }, { id: 'h', kind: 'huddle', minutes: 4 }] }))
    expect(document.querySelector('.run-picture')).toBe(null)
    await user.click(screen.getByRole('button', { name: 'Show picture' }))
    expect(document.querySelector('.run-picture svg')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Hide picture' }))
    expect(document.querySelector('.run-picture')).toBe(null)
  })

  it('has no picture button for a drill without one', async () => {
    await open(plan({ blocks: [{ id: 'a', kind: 'drill', drillId: noPic.id, minutes: 10 }, { id: 'h', kind: 'huddle', minutes: 4 }] }))
    expect(screen.queryByRole('button', { name: /picture/ })).toBe(null)
  })

  it('keeps the opening line and puts the huddle points behind one tap, only before Start', async () => {
    const user = userEvent.setup()
    await open(plan())
    expect(screen.getByText('Welcome in.')).toBeTruthy()
    expect(document.querySelector('.huddle-points')).toBe(null)
    await user.click(screen.getByRole('button', { name: 'Huddle points' }))
    expect(document.querySelectorAll('.huddle-points li').length).toBeGreaterThan(1)
    // Once the clock runs, the opener and the huddle points get out of the way.
    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.queryByText('Welcome in.')).toBe(null)
    expect(screen.queryByRole('button', { name: /huddle points/i })).toBe(null)
    expect(document.querySelector('.huddle-points')).toBe(null)
  })

  it('shows the Say line under the clock and keeps the coaching bullets behind How it works', async () => {
    const user = userEvent.setup()
    await open(plan({ blocks: [{ id: 'a', kind: 'drill', drillId: other.id, minutes: 10 }, { id: 'h', kind: 'huddle', minutes: 4 }] }))
    const say = cuesFor(other)[0].say
    expect(screen.getByText('Say:').closest('p').textContent).toContain(say)
    // Nothing else to read: not the steps, not the coaching points.
    expect(screen.queryByText(other.steps[0])).toBe(null)
    if (other.points[0]) expect(screen.queryByText(other.points[0])).toBe(null)
    const how = screen.getByRole('button', { name: 'How it works' })
    expect(how.getAttribute('aria-expanded')).toBe('false')
    await user.click(how)
    expect(screen.getByText(other.steps[0])).toBeTruthy()
    if (other.points[0]) expect(screen.getByText(other.points[0])).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Hide how it works' }).getAttribute('aria-expanded')).toBe('true')
    // It closes again on the next block.
    await user.click(screen.getByRole('button', { name: 'Next block' }))
    expect(screen.queryByText(other.steps[0])).toBe(null)
  })

  it('always shows what is next, above the buttons, in every block', async () => {
    const user = userEvent.setup()
    await open(plan())
    const total = 5
    for (let i = 0; i < total; i++) {
      const line = document.querySelector('.run-next')
      expect(line, `block ${i + 1}`).toBeTruthy()
      expect(line.textContent).toMatch(i < total - 1 ? /^Next: .+, \d+ min$/ : /^Last block$/)
      // The line sits in the footer with the buttons, not in the scrolling middle.
      expect(line.parentElement).toBe(document.querySelector('.run-controls').parentElement)
      expect(document.querySelector('.run-body').contains(line)).toBe(false)
      if (i < total - 1) await user.click(screen.getByRole('button', { name: 'Next block' }))
    }
  })
})

describe('station groups in the timer', () => {
  it('says how many kids are in each group', async () => {
    const p = stationPlan()
    p.blocks[0].groups = [1, 7]
    await open(p)
    expect(screen.getByRole('button', { name: new RegExp(`Group 1 \\(1 kid\\) → ${withPic.name}`) })).toBeTruthy()
    expect(screen.getByRole('button', { name: new RegExp(`Group 2 \\(7 kids\\) → ${noPic.name}`) })).toBeTruthy()
  })

  it('names where group 1 goes next, and goes back to the usual line after the last rotation', async () => {
    const user = userEvent.setup()
    await open(stationPlan())
    // Rotation 1: group 1 moves to the second station.
    expect(document.querySelector('.run-next').textContent).toBe(`Next: rotate. Group 1 → ${noPic.name}, 5 min`)
    await user.click(screen.getByRole('button', { name: 'Next block' }))
    // Rotation 2 (the last): back to the plain next block.
    expect(screen.getByText('Rotation 2 of 2')).toBeTruthy()
    expect(document.querySelector('.run-next').textContent).toMatch(/^Next: .*, 4 min$/)
    expect(document.querySelector('.run-next').textContent).not.toMatch(/rotate/)
  })

  it('tells the adult which group to stand with for a station the kids run', async () => {
    const user = userEvent.setup()
    const p = stationPlan()
    p.blocks[0].staff = [{ type: 'run', who: 'coach' }, { type: 'watch', who: null, near: 0 }]
    await open(p)
    // Rotation 1: station 1 holds group 1.
    expect(screen.getByText('Kids run it. Keep an eye from Group 1')).toBeTruthy()
    expect(screen.queryByText(/Watch from station/)).toBe(null)
    await user.click(screen.getByRole('button', { name: 'Next block' }))
    // Rotation 2: groups swap stations, so station 1 now holds group 2.
    expect(screen.getByText('Kids run it. Keep an eye from Group 2')).toBeTruthy()
  })

  it('keeps the clock, the next line and the buttons out of the scrolling list', async () => {
    await open(stationPlan())
    const body = document.querySelector('.run-body')
    expect(body.contains(document.querySelector('.run-stations'))).toBe(true)
    for (const sel of ['.clock', '.run-next', '.run-controls']) expect(body.contains(document.querySelector(sel)), sel).toBe(false)
  })
})

describe('running late', () => {
  it('adds a minute to this block only, without touching the saved plan', async () => {
    const user = userEvent.setup()
    await open(plan())
    expect(screen.getByRole('timer').textContent).toBe('10:00')
    await user.click(screen.getByRole('button', { name: 'Add one minute to this block' }))
    expect(screen.getByRole('timer').textContent).toBe('11:00')
    expect(screen.getByText(/Next: .*, 10 min/)).toBeTruthy()
    expect((await db.plans.get('p1')).blocks[0].minutes).toBe(10)
  })

  it('says nothing until practice is more than 3 minutes behind', async () => {
    window.localStorage.setItem('run:p1', JSON.stringify({ index: 0, startedAt: null, elapsed: 0, adj: {}, startedWall: Date.now() - 2 * 60 * 1000 }))
    await open(plan())
    expect(screen.queryByText(/behind/)).toBe(null)
  })

  it('offers to trim the rest, says what it did, and leaves breaks and the huddle alone', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem('run:p1', JSON.stringify({ index: 0, startedAt: null, elapsed: 0, adj: {}, startedWall: Date.now() - 6 * 60 * 1000 }))
    await open(plan())
    // 6 minutes after the start with nothing done: 6 minutes behind.
    expect(screen.getByText(/Running 6 min behind/)).toBeTruthy()
    // Trim is a button next to +1 min, and the lateness is its own line.
    const trimBtn = screen.getByRole('button', { name: 'Trim the rest to finish on time' })
    expect(trimBtn.className).toContain('run-btn')
    expect(trimBtn.parentElement).toBe(screen.getByRole('button', { name: 'Add one minute to this block' }).parentElement)
    expect(screen.getByText(/Running 6 min behind/).className).toContain('run-late')
    await user.click(trimBtn)
    expect(screen.getByRole('status').textContent).toMatch(/Trimmed 6 min from the drills ahead/)
    expect(screen.getByRole('status').textContent).toMatch(/Water breaks and the closing huddle are unchanged/)
    const saved = JSON.parse(window.localStorage.getItem('run:p1'))
    expect(saved.adj.w).toBeUndefined()
    expect(saved.adj.h).toBeUndefined()
    expect(saved.adj.a).toBeUndefined()
    expect(saved.adj.b).toBeLessThan(600)
    expect(saved.adj.b).toBeGreaterThanOrEqual(360)
    expect((await db.plans.get('p1')).blocks[1].minutes).toBe(10)
  })
})

describe('catching up after the screen was off', () => {
  it('lands on the right block with the right time left', async () => {
    // 25 minutes ago: blocks of 10, 10 and a 2-minute break are done, 3 minutes into the next drill.
    window.localStorage.setItem('run:p1', JSON.stringify({ index: 0, startedAt: Date.now() - 25 * 60 * 1000, elapsed: 0, adj: {}, startedWall: Date.now() - 25 * 60 * 1000 }))
    await open(plan())
    await waitFor(() => expect(screen.getByText(/Block 4 of 5/)).toBeTruthy())
    expect(screen.getByRole('status').textContent).toBe('Caught up after the screen was off')
    const [m, s] = screen.getByRole('timer').textContent.split(':').map(Number)
    expect(m * 60 + s).toBeGreaterThan(6 * 60 + 50)
    expect(m * 60 + s).toBeLessThanOrEqual(7 * 60)
  })

  it('finishes when the time ran past the end of practice', async () => {
    window.localStorage.setItem('run:p1', JSON.stringify({ index: 0, startedAt: Date.now() - 90 * 60 * 1000, elapsed: 0, adj: {}, startedWall: Date.now() - 90 * 60 * 1000 }))
    await open(plan())
    expect(await screen.findByText('Practice complete')).toBeTruthy()
  })
})

describe('the finish screen', () => {
  it('leads to the recap for this practice, with its date', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem('run:p1', JSON.stringify({ index: 4, startedAt: null, elapsed: 0, adj: {}, startedWall: null }))
    const t = await saveTeam(team)
    await db.plans.bulkPut([{ ...plan(), teamId: t.id }, { ...plan({ id: 'p2', date: '2026-11-09' }), teamId: t.id }])
    window.location.hash = '#/run/p1'
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Next block' }))
    const finish = await screen.findByText('Practice complete')
    expect(finish).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '2-minute recap' }))
    expect(window.location.hash).toBe('#/debrief/practice/p1')
    await user.click(await screen.findByRole('button', { name: 'Change' }))
    expect((await screen.findByLabelText('Which practice')).value).toBe('p1')
    expect(screen.getByLabelText('Date').value).toBe('2026-11-05')
  })
})
