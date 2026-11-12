// Stage 12E: Settings as a list, Browse drills on Today, quiet optionals, no fake defaults, one highlighted choice.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { db, saveTeam, clearEverything } from './lib/db.js'
import { defaultRules } from './data/constants.js'
import { allDrills } from './data/drills.js'
import { filterDrills } from './components/Drills.jsx'
import { buildPlan, localDate } from './lib/plan.js'

const team = { name: 'Blue Jays', division: '10U', experience: 'some', needs: ['grounders'], unsure: ['bunting'], rules: defaultRules('10U') }
const words = (el) => el.textContent.trim().split(/\s+/).length
const reset = async () => {
  await clearEverything()
  window.localStorage.clear()
}

describe('Settings as a short list', () => {
  beforeEach(reset)

  it('opens as a list under 80 words and 9 actions, one row per section, with no controls from the sections', async () => {
    await saveTeam({ ...team })
    window.location.hash = '#/settings'
    render(<App />)
    await screen.findByRole('button', { name: /^Display/ })
    const main = document.querySelector('main')
    expect(words(main)).toBeLessThan(80)
    // Rows, plus Back in the header: no setting control is on the list itself.
    expect(main.querySelectorAll('button').length).toBeLessThanOrEqual(8)
    for (const name of ['Save backup', 'Restore', 'Send feedback', 'Share AttaCoach', 'Delete everything on this device']) expect(screen.queryByRole('button', { name })).toBe(null)
    expect(screen.queryByRole('group', { name: 'Theme' })).toBe(null)
  })

  it('every row opens its section, and Back returns to the list; the danger row is last', async () => {
    const user = userEvent.setup()
    await saveTeam({ ...team })
    window.location.hash = '#/settings'
    render(<App />)
    await screen.findByRole('button', { name: /^Display/ })
    const rows = [...document.querySelectorAll('.settings-row')]
    expect(rows.map((r) => r.querySelector('strong').textContent)).toEqual(['Coach profile', 'Display', 'Backup and restore', 'Share and support', 'Privacy', 'About and feedback', 'Testing tools', 'Delete everything'])
    expect(rows[rows.length - 1].className).toContain('danger-row')
    await user.click(screen.getByRole('button', { name: /^Backup and restore/ }))
    expect(window.location.hash).toBe('#/settings/backup')
    expect(screen.getByRole('button', { name: 'Save backup' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => expect(window.location.hash).toBe('#/settings'))
    expect(await screen.findByRole('button', { name: /^Display/ })).toBeTruthy()
  })

  it('keeps every existing control inside a section', async () => {
    const want = {
      profile: [/Edit|Add your name/],
      display: ['Light', 'Dark'],
      backup: ['Save backup', 'Restore'],
      share: ['Share AttaCoach'],
      about: ['Send feedback'],
      testing: ['Start over and replay setup'],
      delete: ['Delete everything on this device'],
    }
    await saveTeam({ ...team })
    for (const [sec, names] of Object.entries(want)) {
      window.location.hash = `#/settings/${sec}`
      const { unmount } = render(<App />)
      for (const n of names) expect((await screen.findAllByRole('button', { name: n })).length).toBeGreaterThan(0)
      unmount()
    }
    window.location.hash = '#/settings/share'
    render(<App />)
    expect(await screen.findByRole('link', { name: 'Donate with PayPal' })).toBeTruthy()
  })

  it('still asks before deleting everything', async () => {
    const user = userEvent.setup()
    await saveTeam({ ...team })
    window.location.hash = '#/settings/delete'
    let asked = null
    window.confirm = (q) => ((asked = q), false)
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Delete everything on this device' }))
    expect(asked).toMatch(/Delete every team and plan/)
    expect(await db.teams.count()).toBe(1)
  })

  it('an unknown section falls back to the list', async () => {
    await saveTeam({ ...team })
    window.location.hash = '#/settings/nope'
    render(<App />)
    expect(await screen.findByRole('button', { name: /^Display/ })).toBeTruthy()
  })
})

describe('Today: Browse drills and quiet optionals', () => {
  beforeEach(reset)
  const day = localDate()

  it('has one quiet Browse drills row with the count for the team, below the main action', async () => {
    const user = userEvent.setup()
    const t = await saveTeam({ ...team })
    await db.plans.put({ ...buildPlan(t, { minutes: 60, adults: 2, kids: 12, date: day, seed: 1 }), teamId: t.id })
    window.location.hash = '#/today'
    render(<App />)
    const row = await screen.findByRole('button', { name: /Browse drills/ })
    const n = filterDrills(allDrills(), { team: t }).length
    expect(row.textContent).toContain(`${n} drills for 10U`)
    const start = (await screen.findAllByRole('button', { name: 'Start practice' }))[0]
    expect(start.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await user.click(row)
    expect(window.location.hash).toBe('#/drills')
  })

  it('works with no plan too, and sits after the planning form', async () => {
    await saveTeam({ ...team })
    window.location.hash = '#/today'
    render(<App />)
    const row = await screen.findByRole('button', { name: /Browse drills/ })
    const build = screen.getByRole('button', { name: 'Build practice plan' })
    expect(build.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('the backup reminder no longer sits above the main action', async () => {
    const t = await saveTeam({ ...team })
    await db.players.bulkPut(Array.from({ length: 3 }, (_, i) => ({ id: `pl${i}`, teamId: t.id, first: `P${i}`, strengths: [], weaknesses: [], positions: [] })))
    window.location.hash = '#/today'
    render(<App />)
    const card = await screen.findByRole('region', { name: 'Backup reminder' })
    const build = screen.getByRole('button', { name: 'Build practice plan' })
    expect(build.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('Team page', () => {
  beforeEach(reset)

  it('leads with a one-line summary; the details fold under it', async () => {
    const user = userEvent.setup()
    await saveTeam({ ...team })
    window.location.hash = '#/team'
    render(<App />)
    const summary = (await screen.findByText(/Baseball · 10U/)).closest('summary')
    const fold = summary.closest('details')
    expect(fold.open).toBe(false)
    expect(fold.textContent).toMatch(/Least sure about teaching/)
    await user.click(summary)
    expect(fold.open).toBe(true)
  })
})

describe('no fake defaults', () => {
  beforeEach(reset)

  it('a new drill starts with an empty Minutes box and a hint; an empty box still saves the same 10 as before', async () => {
    const user = userEvent.setup()
    await saveTeam({ ...team })
    window.location.hash = '#/mydrill/new'
    render(<App />)
    const minutes = await screen.findByLabelText('Minutes')
    expect(minutes.value).toBe('')
    expect(minutes.placeholder).toMatch(/Enter minutes/)
    await user.type(screen.getByLabelText('Name'), 'Mine')
    await user.type(screen.getByLabelText(/Steps/i), 'Do the thing')
    await user.click(screen.getByRole('button', { name: /^Save/ }))
    await waitFor(async () => expect((await db.customDrills.toArray())[0]?.minutes).toBe(10))
  })
})

describe('one highlighted choice on the Log', () => {
  beforeEach(reset)

  it('highlights the game debrief by default, with the practice recap under "Or"', async () => {
    await saveTeam({ ...team })
    window.location.hash = '#/log'
    render(<App />)
    const game = await screen.findByRole('button', { name: 'Game debrief' })
    const practice = screen.getByRole('button', { name: 'Practice recap' })
    expect(game.className).toContain('recommended')
    expect(practice.className).not.toContain('recommended')
    expect(within(game).getByText(/Score, what you saw/)).toBeTruthy()
    expect(screen.getByText('Or')).toBeTruthy()
  })

  it('highlights the practice recap when a past practice has none', async () => {
    const user = userEvent.setup()
    const t = await saveTeam({ ...team })
    await db.plans.put({ ...buildPlan(t, { minutes: 60, adults: 2, kids: 12, date: '2026-01-05', seed: 1 }), teamId: t.id })
    window.location.hash = '#/log'
    render(<App />)
    const practice = await screen.findByRole('button', { name: 'Practice recap' })
    expect(practice.className).toContain('recommended')
    expect(screen.getByRole('button', { name: 'Game debrief' }).className).not.toContain('recommended')
    await user.click(practice)
    expect(window.location.hash).toBe('#/debrief/practice')
  })
})
