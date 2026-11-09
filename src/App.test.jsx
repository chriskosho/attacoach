import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { db, saveTeam, exportBackup, importBackup, clearEverything } from './lib/db.js'
import { defaultRules } from './data/constants.js'
import { buildPlan } from './lib/plan.js'
import { segmentsFor, fmtTime } from './components/RunTimer.jsx'
import { parseRoute } from './lib/route.js'
import { resetFake, seedSession, setOnline } from './test/fakeSupabase.js'

vi.mock('./lib/supabase.js', async () => {
  const { fake } = await import('./test/fakeSupabase.js')
  return { getClient: () => fake, AUTH_STORAGE_KEY: 'attacoach-auth' }
})

beforeEach(async () => {
  await clearEverything()
  window.location.hash = ''
  try { window.localStorage.clear() } catch { /* ignore */ }
  resetFake()
  setOnline(true)
  seedSession()
})

const press = (name) => screen.getByRole('button', { name })

describe('first run setup', () => {
  it('walks through the four steps and lands on Today', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(await screen.findByText('Set up your team')).toBeTruthy()
    const next = () => press('Next')
    expect(next().disabled).toBe(true)
    await user.type(screen.getByLabelText('Team name'), 'Blue Jays')
    await user.click(press('12U'))
    await user.click(next())

    await user.click(screen.getByRole('button', { name: /New to coaching/ }))
    await user.click(next())

    await user.click(press('Base running'))
    await user.click(press('Knowing where to throw'))
    await user.click(next())

    // Rules default on at 12U.
    const leading = screen.getByRole('checkbox', { name: /Leading off/ })
    expect(leading.checked).toBe(true)
    await user.click(leading)
    await user.click(press('Save and start planning'))

    expect(await screen.findByText("Plan a practice")).toBeTruthy()
    const [team] = await db.teams.toArray()
    expect(team).toMatchObject({ name: 'Blue Jays', division: '12U', experience: 'new', needs: ['baserunning', 'awareness'] })
    expect(team.rules.leadoff).toBe(false)
    expect(team.rules.droppedThird).toBe(true)
  })

  it('hides needs that do not fit young divisions', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText('Team name'), 'Tiny')
    await user.click(press('4U'))
    await user.click(press('Next'))
    await user.click(screen.getByRole('button', { name: /New to coaching/ }))
    await user.click(press('Next'))
    expect(screen.queryByRole('button', { name: 'Pitching' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Catching the ball' })).toBeTruthy()
  })

  it('starts 8U with leading off and dropped third strike off', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText('Team name'), 'Eights')
    await user.click(press('8U'))
    await user.click(press('Next'))
    await user.click(screen.getByRole('button', { name: /A few seasons/ }))
    await user.click(press('Next'))
    await user.click(press('Making contact'))
    await user.click(press('Next'))
    expect(screen.getByRole('checkbox', { name: /Leading off/ }).checked).toBe(false)
    expect(screen.getByRole('checkbox', { name: /Dropped third strike/ }).checked).toBe(false)
  })
})

describe('planning', () => {
  beforeEach(async () => {
    await saveTeam({ name: 'Hawks', division: '10U', experience: 'some', needs: ['grounders', 'contact'], rules: defaultRules('10U') })
  })

  it('builds a plan that opens with a warm-up and closes with a huddle', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: '90' }))
    await user.click(press('3'))
    await user.click(press('Build practice plan'))
    expect(await screen.findByText('90 of 90 min')).toBeTruthy()
    const list = screen.getByRole('list', { name: 'Practice blocks' })
    const items = within(list).getAllByRole('listitem')
    expect(items[items.length - 1].textContent).toContain('Team huddle')
    expect(list.textContent).toContain('Stations')
    expect(screen.getByText(/Open practice with/)).toBeTruthy()
    expect(window.location.hash).toMatch(/^#\/plan\//)
  })

  it('opens a block, changes its minutes and flags the overrun', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: '60' }))
    await user.click(press('1'))
    await user.click(press('Build practice plan'))
    await screen.findByText('60 of 60 min')
    const list = screen.getByRole('list', { name: 'Practice blocks' })
    const first = within(list).getAllByRole('listitem')[0]
    await user.click(within(first).getAllByRole('button')[0])
    expect(within(first).getByText('Coaching points')).toBeTruthy()
    await user.click(within(first).getByRole('button', { name: 'One minute more' }))
    expect(await screen.findByText('61 of 60 min')).toBeTruthy()
    expect(screen.getByText(/1 minutes over/)).toBeTruthy()
  })

  it('swaps a drill for an alternative', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Build practice plan' }))
    await screen.findByRole('list', { name: 'Practice blocks' })
    const before = (await db.plans.toArray())[0]
    const list = screen.getByRole('list', { name: 'Practice blocks' })
    const first = within(list).getAllByRole('listitem')[0]
    await user.click(within(first).getAllByRole('button')[0])
    await user.click(within(first).getByRole('button', { name: 'Swap' }))
    const dialog = await screen.findByRole('dialog')
    const option = within(dialog).getAllByRole('button').find((b) => b.className.includes('drill-row'))
    await user.click(option)
    await waitFor(async () => {
      const after = (await db.plans.toArray())[0]
      expect(after.blocks[0].drillId).not.toBe(before.blocks[0].drillId)
    })
  })

  it('undoes a removed block', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Build practice plan' }))
    const list = await screen.findByRole('list', { name: 'Practice blocks' })
    const count = list.children.length
    const first = list.children[0]
    await user.click(within(first).getAllByRole('button')[0])
    await user.click(within(first).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(list.children.length).toBe(count - 1))
    await user.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(list.children.length).toBe(count))
  })

  it('saves the practice date and shows it on the plan', async () => {
    const user = userEvent.setup()
    render(<App />)
    const input = await screen.findByLabelText('Practice date')
    fireEvent.change(input, { target: { value: '2030-03-15' } })
    await user.click(press('Build practice plan'))
    await screen.findByRole('list', { name: 'Practice blocks' })
    const [plan] = await db.plans.toArray()
    expect(plan.date).toBe('2030-03-15')
    expect(screen.getByText(/Mar 15/)).toBeTruthy()
  })

  it('lists saved plans', async () => {
    const team = (await db.teams.toArray())[0]
    await db.plans.put(buildPlan(team, { minutes: 75, seed: 1 }))
    window.location.hash = '#/plans'
    render(<App />)
    expect(await screen.findByText(/75 minutes/)).toBeTruthy()
  })
})

describe('drill library', () => {
  it('filters to the team and opens a drill', async () => {
    await saveTeam({ name: 'Hawks', division: '8U', experience: 'some', needs: ['contact'], rules: defaultRules('8U') })
    window.location.hash = '#/drills'
    const user = userEvent.setup()
    render(<App />)
    await screen.findByPlaceholderText('Search drills')
    expect(screen.queryByText('Leading off')).toBeNull()
    await user.type(screen.getByPlaceholderText('Search drills'), 'soft toss')
    await user.click(screen.getByRole('button', { name: /Soft toss/ }))
    expect(await screen.findByText('Make it harder')).toBeTruthy()
  })
})

describe('timer', () => {
  it('splits stations into one segment per rotation', () => {
    const plan = buildPlan({ division: '10U', rules: defaultRules('10U'), experience: 'some', needs: ['grounders'] }, { minutes: 90, coaches: 3, seed: 4 })
    const segs = segmentsFor(plan)
    const total = segs.reduce((s, x) => s + x.seconds, 0)
    expect(total).toBe(90 * 60)
    const rot = segs.filter((s) => s.kind === 'stations')
    expect(rot.length % 3).toBe(0)
    expect(fmtTime(65)).toBe('1:05')
    expect(fmtTime(-3)).toBe('0:00')
  })
})

describe('backup', () => {
  it('round-trips teams and plans', async () => {
    const team = await saveTeam({ name: 'A', division: '14U', experience: 'experienced', needs: ['pitching'], rules: defaultRules('14U') })
    await db.plans.put(buildPlan(team, { minutes: 60, seed: 2 }))
    const data = await exportBackup()
    await clearEverything()
    const r = await importBackup(JSON.parse(JSON.stringify(data)))
    expect(r).toEqual({ teams: 1, plans: 1, debriefs: 0 })
    expect((await db.settings.get('currentTeamId')).value).toBe(team.id)
  })

  it('rejects other files', async () => {
    await expect(importBackup({ hello: 1 })).rejects.toThrow('not an AttaCoach backup')
  })
})

describe('routes', () => {
  it('parses hashes', () => {
    expect(parseRoute('')).toEqual({ name: 'today', id: null })
    expect(parseRoute('#/plan/abc')).toEqual({ name: 'plan', id: 'abc' })
  })
})
