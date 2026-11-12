// Stage 12I: the coach always runs a station. No role to pick, and none mentioned.
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { saveTeam, savePlayers, clearEverything } from './lib/db.js'
import { defaultRules } from './data/constants.js'
import { buildPlan, staffingFor } from './lib/plan.js'
import { staffSummary } from './lib/practices.js'
import { blankPlayer } from './lib/roster.js'
import { SCENARIOS } from './data/scenarios.js'
import { VERSION, CHANGELOG } from './changelog.js'

const team = { name: 'Hawks', sport: 'baseball', division: '10U', rules: defaultRules('10U'), experience: 'some', needs: ['contact'], adults: 3 }

beforeEach(async () => {
  await clearEverything()
  window.location.hash = ''
  try { window.localStorage.clear() } catch { /* ignore */ }
})

describe('the coach always runs a station', () => {
  it('every adult runs one, and an old saved role is ignored', () => {
    expect(staffingFor({ adults: 4, role: 'float' })).toMatchObject({ coachRole: 'run', runSlots: 4 })
    const plan = buildPlan({ id: 't', ...team }, { minutes: 90, adults: 4, kids: 12, seed: 3 })
    expect(plan.coachRole).toBe('run')
    const whos = plan.blocks.filter((b) => b.kind === 'stations').flatMap((b) => b.staff.map((s) => s.who))
    expect(whos).toContain('coach')
  })

  it('the adults line never mentions a role', () => {
    for (const n of [1, 2, 3, 6]) expect(staffSummary(n)).not.toMatch(/float|run a station|suggest/i)
  })

  it('no screen offers or mentions Suggest, Float or Run a station', () => {
    const files = ['Today.jsx', 'PracticeSetup.jsx', 'Setup.jsx', 'TeamPage.jsx', 'PlanView.jsx']
    for (const f of files) {
      const src = fs.readFileSync(`src/components/${f}`, 'utf8')
      expect(src, f).not.toMatch(/Your role|Run a station|you float|You float|COACH_ROLES|coachRole/)
    }
    for (const sc of SCENARIOS) expect(JSON.stringify(sc), sc.id).not.toMatch(/coachRole/)
  })

  it('Today, the practice steps and the plan header show only the adult count', async () => {
    const user = userEvent.setup()
    const t = await saveTeam({ ...team })
    await savePlayers(t.id, Array.from({ length: 12 }, (_, i) => ({ ...blankPlayer(), first: `P${i}` })))
    window.location.hash = '#/today'
    render(<App />)
    await user.click(await screen.findByText(/Change today's setup/))
    expect(screen.queryByText(/Your role|Float|Suggest/)).toBe(null)
    expect(screen.queryByRole('group', { name: 'Your role' })).toBe(null)
    await user.click(screen.getByRole('button', { name: 'Build practice plan' }))
    await screen.findByRole('list', { name: 'Practice blocks' })
    await user.click(await screen.findByRole('button', { name: /^3 adults ›/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Change of plans' })
    expect(within(sheet).queryByText(/role|float/i)).toBe(null)
  })

  it('has a plain entry for this version', () => {
    expect(VERSION).toBe('1.39.0')
    expect(CHANGELOG[0].version).toBe(VERSION)
  })
})
