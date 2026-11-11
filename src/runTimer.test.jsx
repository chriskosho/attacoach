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
    expect(screen.getByRole('button', { name: new RegExp(`Group 1 → ${withPic.name}`) })).toBeTruthy()
    expect(screen.getByRole('button', { name: new RegExp(`Group 2 → ${noPic.name}`) })).toBeTruthy()
    expect(screen.getByText('You run it')).toBeTruthy()
    expect(screen.getByText('Kids run it')).toBeTruthy()
  })

  it('opens a station in place with its steps, and the clock stays', async () => {
    const user = userEvent.setup()
    await open(stationPlan())
    const row = screen.getByRole('button', { name: new RegExp(`Group 1 → ${withPic.name}`) })
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

  it('keeps the opening line and puts the huddle points behind one tap', async () => {
    const user = userEvent.setup()
    await open(plan())
    expect(screen.getByText('Welcome in.')).toBeTruthy()
    expect(document.querySelector('.huddle-points')).toBe(null)
    await user.click(screen.getByRole('button', { name: 'Huddle points' }))
    expect(document.querySelectorAll('.huddle-points li').length).toBeGreaterThan(1)
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
    await user.click(screen.getByRole('button', { name: 'Trim the rest to finish on time' }))
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
    expect((await screen.findByLabelText('Which practice')).value).toBe('p1')
    expect(screen.getByLabelText('Date').value).toBe('2026-11-05')
  })
})
