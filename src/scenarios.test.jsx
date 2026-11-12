import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { db, clearEverything } from './lib/db.js'
import { SCENARIOS } from './data/scenarios.js'
import { loadScenario } from './lib/scenarios.js'
import { buildPlan } from './lib/plan.js'
import { teamPractices } from './lib/practices.js'
import { needsForDivision } from './data/constants.js'
import { DRILLS } from './data/drills.js'

describe('test scenarios', () => {
  beforeEach(clearEverything)

  it('every scenario saves a complete team and plans every one of its practices', async () => {
    for (const sc of SCENARIOS) {
      await clearEverything()
      const team = await loadScenario(sc)
      const ids = needsForDivision(team.division, DRILLS).map((n) => n.id)
      expect(team.needs.every((n) => ids.includes(n)), sc.id).toBe(true)
      expect(await db.players.where('teamId').equals(team.id).count(), sc.id).toBe(sc.players.length)
      expect((await db.settings.get('coachName')).value).toBe(sc.coach)
      for (const p of teamPractices(team)) {
        const plan = buildPlan(team, { minutes: p.minutes, adults: 2, kids: sc.players.length, spaces: p.spaces, equipment: team.equipment, seed: 7 })
        expect(plan.blocks.length, `${sc.id} / ${p.name}`).toBeGreaterThan(2)
      }
    }
  })

  it('applies the scenario\'s rules, and keeps an existing coach name when asked', async () => {
    const sc = SCENARIOS.find((s) => s.id === 'no-steal-12u')
    const team = await loadScenario(sc)
    expect(team.rules).toMatchObject({ stealing: false, leadoff: false, droppedThird: false })
    await loadScenario(SCENARIOS[0], { keepCoach: true })
    expect((await db.settings.get('coachName')).value).toBe('Robin')
    expect(await db.teams.count()).toBe(2)
  })
})

describe('skipping setup and testing tools in the app', () => {
  beforeEach(async () => {
    await clearEverything()
    window.location.hash = ''
  })

  it('skips straight to a plan with sensible defaults', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Skip setup' }))
    expect(await screen.findByRole('list', { name: 'Practice blocks' })).toBeTruthy()
    const [team] = await db.teams.toArray()
    expect(team).toMatchObject({ name: 'My Team', division: '10U', experience: 'some' })
    expect(await db.plans.count()).toBe(1)
  })

  it('keeps what was typed when skipping', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText("What's your name?"), 'Chris')
    await user.type(screen.getByLabelText('Team name'), 'Hawks')
    await user.click(screen.getByRole('button', { name: '6U' }))
    await user.click(screen.getByRole('button', { name: 'Skip setup' }))
    await screen.findByRole('list', { name: 'Practice blocks' })
    expect(await db.teams.toArray()).toMatchObject([{ name: 'Hawks', division: '6U' }])
    expect((await db.settings.get('coachName')).value).toBe('Chris')
  })

  it('loads a ready-made team from the first screen and lands on its plan', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByText('Try a sample team'))
    await user.click(screen.getByRole('button', { name: /Over-rostered travel team/ }))
    await screen.findByRole('list', { name: 'Practice blocks' })
    const [team] = await db.teams.toArray()
    expect(team.name).toBe('Thunder')
    expect(team.sample).toBe(true)
    expect(await db.players.count()).toBe(14)
  })

  it('adds a scenario from Settings and can replay setup', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await loadScenario(SCENARIOS[0])
    window.location.hash = '#/settings/testing'
    render(<App />)
    const group = await screen.findByRole('group', { name: 'Add a ready-made team' })
    await user.click(within(group).getByRole('button', { name: /Winter cage only/ }))
    await waitFor(async () => expect(await db.teams.count()).toBe(2))
    await waitFor(() => expect(window.location.hash).toBe('#/today')) // loading a team sends you to Today
    window.location.hash = '#/settings/testing'
    await user.click(await screen.findByRole('button', { name: 'Start over and replay setup' }))
    expect(await screen.findByText('Set up your team', {}, { timeout: 4000 })).toBeTruthy()
    expect(await db.teams.count()).toBe(0)
  })
})
