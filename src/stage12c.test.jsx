// Stage 12C: finished practices (finishedAt, or a linked recap) and what Today shows after practice.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { db, saveTeam, clearEverything, exportBackup, importBackup } from './lib/db.js'
import { defaultRules } from './data/constants.js'
import { buildPlan, localDate } from './lib/plan.js'
import { nextPlan, isFinished, finishedToday } from './lib/todayRules.js'

const today = localDate()
const day = (offset) => localDate(new Date(Date.now() + offset * 86400000))
const team = { name: 'Blue Jays', division: '10U', experience: 'some', needs: ['grounders'], rules: defaultRules('10U') }
const mk = (id, date, extra = {}) => ({ id, date, createdAt: `${date}T10:00:00Z`, focus: ['grounders'], minutes: 60, blocks: [], ...extra })

async function seed(plans) {
  const t = await saveTeam({ ...team })
  for (const p of plans) {
    const full = { ...buildPlan(t, { minutes: 60, adults: 2, kids: 12, date: p.date, seed: 1 }), ...p, teamId: t.id }
    await db.plans.put(full)
  }
  return t
}
const startButtons = () => screen.queryAllByRole('button', { name: 'Start practice' })

describe('finished plans, as rules', () => {
  it('skips a plan with finishedAt or a linked recap; plans without either behave as before', () => {
    const plans = [mk('done', '2026-06-01', { finishedAt: '2026-06-01T19:00:00Z' }), mk('next', '2026-06-03'), mk('recapped', '2026-06-02')]
    const debriefs = [{ kind: 'practice', planId: 'recapped', date: '2026-06-02' }]
    expect(nextPlan(plans, '2026-06-01', debriefs).id).toBe('next')
    expect(isFinished(plans[0], [])).toBe(true)
    expect(isFinished(plans[2], debriefs)).toBe(true)
    expect(isFinished(plans[1], debriefs)).toBe(false)
    // A game debrief or a recap for another plan does not finish it.
    expect(isFinished(plans[1], [{ kind: 'game', planId: 'next' }, { kind: 'practice', planId: 'x' }])).toBe(false)
    // Old plans (no finishedAt) and no debriefs: same as before 12C.
    expect(nextPlan([mk('a', '2026-06-01'), mk('b', '2026-06-03')], '2026-06-01').id).toBe('a')
  })

  it('finishedToday finds the plan finished today, with its recap when there is one', () => {
    const plans = [mk('t', '2026-06-01', { finishedAt: '2026-06-01T19:00:00Z' }), mk('y', '2026-05-31', { finishedAt: '2026-05-31T19:00:00Z' })]
    expect(finishedToday(plans, [], '2026-06-01')).toEqual({ plan: plans[0], recap: null })
    const recap = { kind: 'practice', planId: 't', date: '2026-06-01' }
    expect(finishedToday(plans, [recap], '2026-06-01').recap).toBe(recap)
    expect(finishedToday(plans, [], '2026-06-02')).toBe(null)
    expect(finishedToday([mk('u', '2026-06-01')], [], '2026-06-01')).toBe(null)
  })
})

describe('Today after practice', () => {
  beforeEach(async () => {
    await clearEverything()
    window.localStorage.clear()
  })

  it('finishing the timer marks the plan finished; Done lands on Today with the done line and the next practice', async () => {
    const user = userEvent.setup()
    await seed([{ id: 'p1', date: today }, { id: 'p2', date: day(2) }])
    const p1 = await db.plans.get('p1')
    window.localStorage.setItem('run:p1', JSON.stringify({ index: 999, startedAt: null, elapsed: 0, adj: {}, startedWall: null }))
    window.location.hash = '#/run/p1'
    render(<App />)
    // Skip to the last block, then Finish.
    await screen.findByRole('timer')
    for (let i = 0; i < 40 && !screen.queryByText('Practice complete'); i++) await user.click(screen.getByRole('button', { name: 'Next block' }))
    expect(screen.getByText('Practice complete')).toBeTruthy()
    await waitFor(async () => expect((await db.plans.get('p1')).finishedAt).toBeTruthy())
    // Nothing else about the plan changed.
    const { finishedAt, updatedAt, ...rest } = await db.plans.get('p1')
    const { updatedAt: u0, ...before } = p1
    expect(rest).toEqual(before)

    await user.click(screen.getByRole('button', { name: 'Done' }))
    const line = await screen.findByText(/Today's practice: done ✓/)
    expect(line.className).toBe('done-line')
    expect(await screen.findByRole('heading', { name: /, 60 minutes|minutes/ })).toBeTruthy()
    // The Next practice card is the one in two days, not the finished one.
    expect(screen.getByRole('heading', { level: 2, name: /minutes/ }).textContent).not.toMatch(/^Today/)
    await user.click(screen.getByRole('button', { name: 'Recap ›' }))
    expect(window.location.hash).toBe('#/debrief/practice/p1')
  })

  it('a linked recap also counts as finished, and the line says Recap saved', async () => {
    const t = await seed([{ id: 'p1', date: today }])
    await db.debriefs.put({ id: 'd1', teamId: t.id, kind: 'practice', planId: 'p1', date: today, createdAt: new Date().toISOString(), needs: [], ratings: {}, notes: '' })
    window.location.hash = '#/today'
    render(<App />)
    expect(await screen.findByText('Recap saved')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Recap ›' })).toBe(null)
    expect(startButtons().length).toBe(0)
    // With nothing else planned, the planning form is there as usual.
    expect(screen.getByRole('heading', { name: 'Plan a practice' })).toBeTruthy()
  })

  it('a plan without finishedAt (an older plan) still shows Start practice and no done line', async () => {
    await seed([{ id: 'p1', date: today }])
    window.location.hash = '#/today'
    render(<App />)
    expect((await screen.findAllByRole('button', { name: 'Start practice' })).length).toBe(1)
    expect(screen.queryByText(/Today's practice: done/)).toBe(null)
  })

  it('a finished plan still opens, and its timer still runs', async () => {
    await seed([{ id: 'p1', date: today, finishedAt: new Date().toISOString() }])
    window.location.hash = '#/plan/p1'
    const { unmount } = render(<App />)
    expect(await screen.findByRole('button', { name: 'Start practice' })).toBeTruthy()
    unmount()
    window.location.hash = '#/run/p1'
    render(<App />)
    expect(await screen.findByRole('timer')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy()
  })
})

describe('backups and finishedAt', () => {
  beforeEach(clearEverything)

  it('a backup includes finishedAt and restore keeps it', async () => {
    const stamp = '2026-11-12T19:00:00.000Z'
    await seed([{ id: 'p1', date: today, finishedAt: stamp }, { id: 'p2', date: day(1) }])
    const data = JSON.parse(JSON.stringify(await exportBackup()))
    expect(data.plans.find((p) => p.id === 'p1').finishedAt).toBe(stamp)
    await clearEverything()
    await importBackup(data)
    expect((await db.plans.get('p1')).finishedAt).toBe(stamp)
    expect((await db.plans.get('p2')).finishedAt).toBeUndefined()
  })

  it('an old backup without finishedAt restores and shows as before', async () => {
    const t = await seed([{ id: 'p1', date: today }])
    const data = JSON.parse(JSON.stringify(await exportBackup()))
    for (const p of data.plans) delete p.finishedAt
    data.version = 4
    await clearEverything()
    await importBackup(data)
    expect((await db.plans.get('p1')).finishedAt).toBeUndefined()
    await db.settings.put({ key: 'currentTeamId', value: t.id })
    window.location.hash = '#/today'
    render(<App />)
    expect((await screen.findAllByRole('button', { name: 'Start practice' })).length).toBe(1)
  })
})

// Short screens: a station block uses the compact layout. jsdom has no matchMedia, so stub it.
import { afterEach } from 'vitest'
import { DRILLS } from './data/drills.js'

describe('station block on a short screen', () => {
  const drills = DRILLS.filter((d) => d.category !== 'warmup').slice(0, 3)
  const stations = (over = {}) => ({
    id: 'p1', date: '2026-11-05', createdAt: '2026-11-05T10:00:00Z', focus: ['grounders'], opener: 'Hi.', closer: 'Bye.', coachRole: 'run',
    blocks: [
      { id: 's', kind: 'stations', stations: drills.map((d) => d.id), stationMinutes: 10, groups: [4, 4, 4], staff: [{ type: 'run', who: 'coach' }, { type: 'kids' }, { type: 'kids' }] },
      { id: 'd', kind: 'drill', drillId: drills[0].id, minutes: 15 },
      { id: 'e', kind: 'drill', drillId: drills[1].id, minutes: 15 },
      { id: 'h', kind: 'huddle', minutes: 4 },
    ],
    ...over,
  })
  const stub = (matches) => {
    window.matchMedia = (q) => ({ matches, media: q, addEventListener() {}, removeEventListener() {} })
  }
  async function open(state) {
    const t = await saveTeam({ ...team })
    await db.plans.put({ ...stations(), teamId: t.id })
    window.localStorage.setItem('run:p1', JSON.stringify({ index: 0, startedAt: null, elapsed: 0, adj: {}, startedWall: null, ...state }))
    window.location.hash = '#/run/p1'
    render(<App />)
    await screen.findByRole('timer')
  }
  beforeEach(async () => {
    await clearEverything()
    window.localStorage.clear()
  })
  afterEach(() => {
    delete window.matchMedia
  })

  it('folds the lateness into the Trim label, keeps +1 min and Trim on one row, and lists every group', async () => {
    stub(true)
    await open({ startedWall: Date.now() - 34 * 60 * 1000 })
    expect(document.querySelector('.run').className).toContain('compact-stations')
    expect(screen.getByText('Stations · Rotation 1 of 3')).toBeTruthy()
    const trim = screen.getByRole('button', { name: 'Trim (34 min behind)' })
    expect(trim.parentElement).toBe(screen.getByRole('button', { name: 'Add one minute to this block' }).parentElement)
    expect(screen.queryByText(/Running 34 min behind/)).toBe(null)
    expect(document.querySelectorAll('.run-station').length).toBe(3)
  })

  it('after Trim the note and Undo sit on the same row, and Undo still restores the times', async () => {
    const user = userEvent.setup()
    stub(true)
    await open({ startedWall: Date.now() - 34 * 60 * 1000 })
    await user.click(screen.getByRole('button', { name: 'Trim (34 min behind)' }))
    const status = screen.getByRole('status')
    expect(status.textContent).toMatch(/^Trimmed \d+ min$/)
    expect(status.parentElement).toBe(screen.getByRole('button', { name: 'Add one minute to this block' }).parentElement)
    expect(JSON.parse(window.localStorage.getItem('run:p1')).adj).not.toEqual({})
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(JSON.parse(window.localStorage.getItem('run:p1')).adj).toEqual({})
  })

  it('in the last 30 seconds the rotate call takes the rotation line', async () => {
    stub(true)
    await open({ elapsed: 580 })
    expect(screen.getByText('Get ready to rotate')).toBeTruthy()
    expect(screen.queryByText('Stations · Rotation 1 of 3')).toBe(null)
  })

  it('taller screens keep the usual layout', async () => {
    stub(false)
    await open({ startedWall: Date.now() - 34 * 60 * 1000 })
    expect(document.querySelector('.run').className).not.toContain('compact-stations')
    expect(screen.getByRole('button', { name: 'Trim the rest to finish on time' })).toBeTruthy()
    expect(screen.getByText(/Running 34 min behind/)).toBeTruthy()
    expect(screen.getByText('Stations')).toBeTruthy()
  })
})
