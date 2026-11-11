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
  const start = async (user, { me = 'Chris', team = 'Blue Jays', division = '12U', sport = 'Baseball' } = {}) => {
    render(<App />)
    expect(await screen.findByText('Set up your team')).toBeTruthy()
    if (me) await user.type(screen.getByLabelText("What's your name?"), me)
    await user.type(screen.getByLabelText('Team name'), team)
    await user.click(press(sport))
    await user.click(press(division))
  }

  it('asks the coach, then team and division, on the very first screen', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Set up your team')
    expect(press('Next').disabled).toBe(true)
    await user.type(screen.getByLabelText('Team name'), 'Blue Jays')
    await user.click(press('12U'))
    expect(press('Next').disabled).toBe(true) // the coach's name is required on first run
    await user.type(screen.getByLabelText("What's your name?"), 'Chris')
    expect(press('Next').disabled).toBe(true) // and baseball or softball
    await user.click(press('Softball'))
    expect(press('Next').disabled).toBe(false)
  })

  it('walks through every step, starts the needs from the players, and lands on a plan', async () => {
    const user = userEvent.setup()
    await start(user)
    await user.click(press('Next'))

    await user.click(screen.getByRole('button', { name: /New to coaching/ }))
    await user.click(press('Next'))

    // Players: a popup asks for the name, then the skills, then offers the next player.
    await user.click(screen.getByRole('button', { name: 'Add a player' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('First name'), 'Sam')
    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    await user.click(within(dialog).getByRole('button', { name: 'Developing' }))
    await user.click(within(within(dialog).getByRole('group', { name: 'Needs work' })).getByRole('button', { name: 'Catching fly balls' }))
    await user.click(within(within(dialog).getByRole('group', { name: 'Positions' })).getByRole('button', { name: 'Shortstop' }))
    await user.click(within(dialog).getByRole('button', { name: 'Save and add next' }))
    expect(within(dialog).getByRole('status').textContent).toContain('Added Sam')
    // Back at the name box, ready for the next player; a first name alone is enough.
    await user.type(within(dialog).getByLabelText('First name'), 'Lee Kim{enter}')
    await user.click(within(dialog).getByRole('button', { name: 'Save and finish' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('list', { name: 'Players' }).children).toHaveLength(2)
    await user.click(press('Next'))

    // Needs start from the players' weak spots, and the coach can still add more.
    expect(screen.getByRole('list', { name: 'Ranked skills' }).textContent).toContain('Catching fly balls')
    await user.click(within(screen.getByRole('group', { name: 'Skills to add' })).getByRole('button', { name: 'Base running' }))
    await user.click(press('Next'))

    // Rules default on at 12U.
    const leading = screen.getByRole('checkbox', { name: /Leading off/ })
    expect(leading.checked).toBe(true)
    await user.click(leading)
    await user.click(press('Next'))
    expect(screen.getByRole('heading', { name: 'How do you practice?' })).toBeTruthy()
    await user.click(press('Save and start planning'))

    expect(await screen.findByRole('list', { name: 'Practice blocks' })).toBeTruthy()
    const [team] = await db.teams.toArray()
    expect(team).toMatchObject({ name: 'Blue Jays', division: '12U', experience: 'new', needs: ['flyballs', 'baserunning'] })
    expect(team.rules.leadoff).toBe(false)
    expect(team.rules.droppedThird).toBe(true)
    expect((await db.settings.get('coachName')).value).toBe('Chris')
    const players = await db.players.toArray()
    expect(players.map((p) => p.first).sort()).toEqual(['Lee', 'Sam'])
    expect(players.find((p) => p.first === 'Lee').last).toBe('Kim')
    expect(players.find((p) => p.first === 'Sam')).toMatchObject({ rating: 'developing', weaknesses: ['flyballs'], positions: ['SS'], teamId: team.id })
    expect(await db.plans.count()).toBe(1)
  })

  it('lets a coach skip everything after the first two screens and still get a starter plan', async () => {
    const user = userEvent.setup()
    await start(user, { team: 'Tiny', division: '6U' })
    await user.click(press('Next'))
    await user.click(screen.getByRole('button', { name: /New to coaching/ }))
    await user.click(press('Next'))
    await user.click(press('Skip for now')) // players
    await user.click(press('Skip for now')) // needs
    await user.click(press('Next')) // league rules
    await user.click(press('Save and start planning'))

    expect(await screen.findByText(/starter plan on the fundamentals for 6U/)).toBeTruthy()
    const [team] = await db.teams.toArray()
    expect(team.needs).toEqual([])
    expect(await db.players.count()).toBe(0)
    const [plan] = await db.plans.toArray()
    expect(plan.focus).toEqual(['catching', 'throwing', 'contact'])
  })

  it('records how the coach feels about teaching, and shows full drill help for those skills', async () => {
    const user = userEvent.setup()
    await start(user)
    await user.click(press('Next'))
    await user.click(screen.getByRole('button', { name: /Experienced/ }))
    await user.click(screen.getByRole('button', { name: 'Not really' }))
    await user.click(within(screen.getByRole('group', { name: 'Least sure about teaching' })).getByRole('button', { name: 'Bunting' }))
    await user.click(press('Next'))
    await user.click(press('Skip for now'))
    await user.click(press('Skip for now'))
    await user.click(press('Next'))
    await user.click(press('Save and start planning'))
    await screen.findByRole('list', { name: 'Practice blocks' })
    const [team] = await db.teams.toArray()
    expect(team).toMatchObject({ played: 'no', unsure: ['bunting'] })
  })

  it('hides needs that do not fit young divisions', async () => {
    const user = userEvent.setup()
    await start(user, { team: 'Tiny', division: '4U' })
    await user.click(press('Next'))
    await user.click(screen.getByRole('button', { name: /New to coaching/ }))
    await user.click(press('Next'))
    await user.click(press('Skip for now'))
    expect(screen.queryByRole('button', { name: 'Pitching' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Catching the ball' })).toBeTruthy()
  })

  it('starts 8U with leading off and dropped third strike off', async () => {
    const user = userEvent.setup()
    await start(user, { team: 'Eights', division: '8U' })
    await user.click(press('Next'))
    await user.click(screen.getByRole('button', { name: /A few seasons/ }))
    await user.click(press('Next'))
    await user.click(press('Skip for now'))
    await user.click(press('Skip for now'))
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
    await user.click(screen.getByRole('button', { name: 'More: Adults at practice' }))
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
    await user.click(screen.getByRole('button', { name: 'Fewer: Adults at practice' }))
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
    // One timer segment per rotation: a block with n stations has n rotations.
    expect(rot.length).toBe(plan.blocks.filter((b) => b.kind === 'stations').reduce((n, b) => n + b.stations.length, 0))
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
    expect(r).toEqual({ teams: 1, plans: 1, debriefs: 0, players: 0, customDrills: 0, templates: 0 })
    expect((await db.settings.get('currentTeamId')).value).toBe(team.id)
  })

  it('rejects other files', async () => {
    await expect(importBackup({ hello: 1 })).rejects.toThrow('not an AttaCoach backup')
  })
})

describe('routes', () => {
  it('parses hashes', () => {
    expect(parseRoute('')).toEqual({ name: 'today', id: null, extra: null })
    expect(parseRoute('#/plan/abc')).toEqual({ name: 'plan', id: 'abc', extra: null })
  })
})
