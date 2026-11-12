// Stage 12G: adults on the team, practices added one at a time and checked before saving, sample teams.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'node:fs'
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import Setup from './components/Setup.jsx'
import { db, saveTeam, clearEverything } from './lib/db.js'
import { defaultRules } from './data/constants.js'
import { practiceStaff, staffSummary } from './lib/practices.js'
import { teamFromScenario } from './lib/scenarioTeam.js'
import { scenarioById } from './data/scenarios.js'
import { store } from './lib/route.js'
import { localDate } from './lib/plan.js'
import { VERSION, CHANGELOG } from './changelog.js'

const base = (over = {}) => ({ name: 'Hawks', sport: 'baseball', division: '10U', rules: defaultRules('10U'), experience: 'some', needs: ['grounders', 'contact'], ...over })
const field = { id: 'pf', name: 'Field practice', day: 2, minutes: 90, spaces: ['field'] }
const cage = { id: 'pc', name: 'Cage night', day: 4, minutes: 60, spaces: ['cage'], adults: 1, coachRole: null }

beforeEach(async () => {
  await clearEverything()
  window.location.hash = ''
  try { window.localStorage.clear() } catch { /* ignore */ }
})

const openPracticeSheet = async (user) => {
  window.location.hash = '#/team'
  render(<App />)
  const card = (await screen.findByRole('heading', { name: 'How you practice' })).closest('section')
  await user.click(within(card).getByRole('button', { name: 'Edit' }))
  return screen.getByRole('dialog')
}

describe('who is at practice', () => {
  it('a practice uses its own adults, then the team, then the last count on this device', () => {
    const team = { adults: 3, coachRole: 'float' }
    expect(practiceStaff(team, field)).toEqual({ adults: 3, role: 'float', own: false })
    expect(practiceStaff(team, cage)).toEqual({ adults: 1, role: 'float', own: true })
    expect(practiceStaff({}, field, 4)).toEqual({ adults: 4, role: 'auto', own: false })
    expect(practiceStaff(null, null)).toEqual({ adults: 2, role: 'auto', own: false })
  })

  it('says the adults line in plain words', () => {
    expect(staffSummary(1, 'auto')).toBe('1 adult, just you')
    expect(staffSummary(3, 'float')).toBe('3 adults, you float')
    expect(staffSummary(2, 'run')).toBe('2 adults, you run a station')
    expect(staffSummary(2, 'auto')).toBe('2 adults')
  })

  it('Today starts from the team adults, and switches when the date lands on a practice with its own', async () => {
    const user = userEvent.setup()
    await saveTeam(base({ adults: 3, coachRole: 'run', practices: [field, cage] }))
    window.location.hash = '#/today'
    render(<App />)
    await user.click(await screen.findByText(/Change today's setup/))
    const adults = () => screen.getByRole('group', { name: 'Adults at practice' }).querySelector('output').textContent
    const date = screen.getByLabelText('Practice date')
    // Pick a Thursday (cage night, 1 adult), then a Tuesday (team: 3 adults).
    const on = (dow) => { const d = new Date(); d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7) + 7); return localDate(d) }
    fireEvent.change(date, { target: { value: on(4) } })
    expect(adults()).toBe('1')
    fireEvent.change(date, { target: { value: on(2) } })
    expect(adults()).toBe('3')
    expect(screen.getByRole('button', { name: 'Run a station' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('a team saved before this falls back to the last count used on this device', async () => {
    store.set('adults', 4)
    await saveTeam(base({ practices: [field] }))
    window.location.hash = '#/today'
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByText(/Change today's setup/))
    expect(screen.getByRole('group', { name: 'Adults at practice' }).querySelector('output').textContent).toBe('4')
  })
})

describe('adding practices one at a time', () => {
  it('asks name and day, then length and where, then adults, and only then adds it to the list', async () => {
    const user = userEvent.setup()
    const t = await saveTeam(base({ adults: 2, coachRole: 'run', practices: [] }))
    const dialog = await openPracticeSheet(user)
    await user.click(within(dialog).getByRole('button', { name: 'More: Adults at practice, counting you' }))
    await user.click(within(dialog).getByRole('button', { name: 'Add a practice' }))
    // The sheet's Save waits until the practice is finished.
    expect(within(dialog).queryByRole('button', { name: 'Save' })).toBe(null)
    expect(within(dialog).getByText('Step 1 of 3')).toBeTruthy()
    const name = within(dialog).getByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'Cage night')
    await user.click(within(within(dialog).getByRole('group', { name: 'Day for Cage night' })).getByRole('button', { name: 'Wed' }))
    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    await user.click(within(within(dialog).getByRole('group', { name: 'Length for Cage night' })).getByRole('button', { name: '75' }))
    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    // Adults: the team's by default, or this practice's own.
    expect(within(dialog).getByRole('button', { name: /Same as the team/ }).getAttribute('aria-pressed')).toBe('true')
    expect(within(dialog).getByRole('button', { name: /Same as the team/ }).textContent).toMatch(/3 adults, you run a station/)
    await user.click(within(dialog).getByRole('button', { name: /Different for this one/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Fewer: Adults at this practice, counting you' }))
    await user.click(within(dialog).getByRole('button', { name: 'Add practice' }))
    // The check-before-saving list.
    const list = within(dialog).getByRole('list', { name: 'Your weekly practices' })
    expect(list.textContent).toMatch(/Cage night/)
    expect(list.textContent).toMatch(/Wed, 75 min/)
    expect(list.textContent).toMatch(/2 adults, you run a station \(just this one\)/)
    expect(within(dialog).getByText('Added Cage night.').getAttribute('role')).toBe('status')
    // Nothing is saved until Save.
    expect((await db.teams.get(t.id)).practices).toEqual([])
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await db.teams.get(t.id)).practices).toHaveLength(1))
    const saved = await db.teams.get(t.id)
    expect(saved).toMatchObject({ adults: 3, coachRole: 'run' })
    expect(saved.practices[0]).toMatchObject({ name: 'Cage night', day: 3, minutes: 75, spaces: ['field'], adults: 2, coachRole: 'run' })
  })

  it('Cancel leaves the list as it was; Edit and Remove work from the list', async () => {
    const user = userEvent.setup()
    await saveTeam(base({ adults: 2, practices: [field, cage] }))
    const dialog = await openPracticeSheet(user)
    await user.click(within(dialog).getByRole('button', { name: 'Add another practice' }))
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(within(dialog).getByRole('list', { name: 'Your weekly practices' }).children).toHaveLength(2)
    await user.click(within(dialog).getByRole('button', { name: 'Edit Field practice' }))
    expect(within(dialog).getByRole('heading', { name: 'Edit Field practice' })).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    await user.click(within(within(dialog).getByRole('group', { name: 'Length for Field practice' })).getByRole('button', { name: '60' }))
    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    await user.click(within(dialog).getByRole('button', { name: 'Save practice' }))
    expect(within(dialog).getByRole('list', { name: 'Your weekly practices' }).textContent).toMatch(/Tue, 60 min/)
    await user.click(within(dialog).getByRole('button', { name: 'Remove Cage night' }))
    expect(within(dialog).getByRole('list', { name: 'Your weekly practices' }).children).toHaveLength(1)
  })

  it('offers one tap to put every practice back on the team adults', async () => {
    const user = userEvent.setup()
    const t = await saveTeam(base({ adults: 2, practices: [field, cage] }))
    const dialog = await openPracticeSheet(user)
    await user.click(within(dialog).getByRole('button', { name: "Use the team's adults for every practice" }))
    expect(within(dialog).queryByRole('button', { name: "Use the team's adults for every practice" })).toBe(null)
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await db.teams.get(t.id)).practices[1].adults).toBeUndefined())
  })

  it('first-run setup saves the team adults and hides "Save and start planning" while a practice is half-entered', async () => {
    const user = userEvent.setup()
    const done = vi.fn()
    render(<Setup first onDone={done} />)
    await user.type(screen.getByLabelText("What's your name?"), 'Chris')
    await user.type(screen.getByLabelText('Team name'), 'Hawks')
    await user.click(screen.getByRole('button', { name: 'Baseball' }))
    await user.click(screen.getByRole('button', { name: '10U' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: /Some experience|A few seasons/ }))
    for (let i = 0; i < 4; i++) await user.click(document.querySelector('.wizard-nav .btn:last-child'))
    expect(screen.getByRole('heading', { name: 'How do you practice?' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'More: Adults at practice, counting you' }))
    await user.click(screen.getByRole('button', { name: 'Add a practice' }))
    expect(screen.queryByRole('button', { name: 'Save and start planning' })).toBe(null)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Add practice' }))
    await user.click(screen.getByRole('button', { name: 'Save and start planning' }))
    await waitFor(() => expect(done).toHaveBeenCalled())
    const [team] = await db.teams.toArray()
    expect(team.adults).toBe(3)
    expect(team.practices).toHaveLength(1)
  })
})

describe('sample teams', () => {
  it('shows on the first screen for everyone, not only with testing tools', () => {
    const src = fs.readFileSync('src/components/Setup.jsx', 'utf8')
    expect(src).not.toMatch(/first && TEST_TOOLS && \(\s*<div className="card/)
    expect(src).toMatch(/Try a sample team/)
  })

  it('a sample team is labelled, points to setting up your own, and deletes without a warning', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm')
    render(<App />)
    await user.click(await screen.findByText('Try a sample team'))
    await user.click(screen.getByRole('button', { name: /Rec team, full roster/ }))
    await screen.findByRole('list', { name: 'Practice blocks' })
    const [t] = await db.teams.toArray()
    expect(t).toMatchObject({ sample: true, adults: 3, coachRole: 'run' })
    window.location.hash = '#/today'
    expect((await screen.findByText(/You're trying a sample team/)).textContent).toMatch(/Sample/)
    expect(screen.getByRole('button', { name: 'Set up your own ›' })).toBeTruthy()
    window.location.hash = '#/team'
    await user.click(await screen.findByRole('button', { name: 'Delete this sample team' }))
    await waitFor(async () => expect(await db.teams.count()).toBe(0))
    expect(confirm).not.toHaveBeenCalled()
  })

  it('sample teams come with adults, and one practice has its own', () => {
    const { team } = teamFromScenario(scenarioById('rec-10u'), 'x')
    expect(team).toMatchObject({ adults: 3, coachRole: 'run' })
    expect(team.practices[0].adults).toBeUndefined()
    expect(team.practices[1]).toMatchObject({ adults: 2, coachRole: 'run' })
  })
})

describe('changelog', () => {
  it('has a plain entry for this version', () => {
    expect(VERSION).toBe('1.37.0')
    expect(CHANGELOG[0].version).toBe(VERSION)
  })
})
