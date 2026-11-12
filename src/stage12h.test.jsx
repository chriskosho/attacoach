// Stage 12H: coach-language sample teams, no backup reminder on a sample, more links instead of pills.
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import { render, screen } from '@testing-library/react'
import App from './App.jsx'
import { saveTeam, savePlayers, clearEverything } from './lib/db.js'
import { defaultRules } from './data/constants.js'
import { SCENARIOS } from './data/scenarios.js'
import { blankPlayer } from './lib/roster.js'
import { VERSION, CHANGELOG } from './changelog.js'

const src = (f) => fs.readFileSync(`src/components/${f}`, 'utf8')

beforeEach(async () => {
  await clearEverything()
  window.location.hash = ''
  try { window.localStorage.clear() } catch { /* ignore */ }
})

describe('sample team descriptions', () => {
  it('read like a coach wrote them, with no tester wording', () => {
    expect(SCENARIOS).toHaveLength(9)
    for (const s of SCENARIOS) {
      expect(s.blurb, s.title).not.toMatch(/\bTests?\b|should (lean|disappear)|over-rostered/i)
      expect(s.title, s.title).not.toMatch(/over-rostered/i)
    }
  })
})

describe('backup reminder on a sample team', () => {
  const team = { name: 'Hawks', sport: 'baseball', division: '10U', rules: defaultRules('10U'), experience: 'some', needs: ['contact'] }
  const addPlayers = (t) => savePlayers(t.id, Array.from({ length: 12 }, (_, i) => ({ ...blankPlayer(), first: `P${i}` })))

  it('a real team with players is asked to save a backup', async () => {
    const t = await saveTeam(team)
    await addPlayers(t)
    window.location.hash = '#/today'
    render(<App />)
    expect(await screen.findByText('Save a backup (takes 10 seconds)')).toBeTruthy()
  })

  it('a sample team never is', async () => {
    const t = await saveTeam({ ...team, sample: true })
    await addPlayers(t)
    window.location.hash = '#/today'
    render(<App />)
    await screen.findByText(/You're trying a sample team/)
    expect(screen.queryByText('Save a backup (takes 10 seconds)')).toBe(null)
  })
})

describe('one clear button, more screens', () => {
  it('secondary choices on the plan, Drills, Team, Roster and Today are links', () => {
    expect(src('Drills.jsx')).not.toMatch(/className="btn (quiet|ghost)"( small)? onClick=\{\(\) => go\('mydrill\/new'\)/)
    for (const f of ['Drills.jsx', 'TeamPage.jsx', 'Roster.jsx']) expect(src(f)).toMatch(/className="link-btn/)
    expect(src('TeamPage.jsx')).not.toMatch(/btn quiet small" onClick=\{editPractice\}/)
    expect(src('PlanView.jsx')).not.toMatch(/btn ghost small no-print/)
    expect(src('Drills.jsx')).toMatch(/link-btn danger-link/)
  })

  it('has a plain entry for this version', () => {
    expect(CHANGELOG.some((c) => c.version === '1.38.0')).toBe(true)
    expect(CHANGELOG[0].version).toBe(VERSION)
  })
})
