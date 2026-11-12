// With no feedback address set, no feedback button appears anywhere.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'

vi.mock('./config.js', async (orig) => ({ ...(await orig()), FEEDBACK_EMAIL: '' }))

import App from './App.jsx'
import { db, saveTeam, clearEverything } from './lib/db.js'
import { defaultRules } from './data/constants.js'
import { DRILLS } from './data/drills.js'

const team = { id: 't1', name: 'Tigers', division: '10U', experience: 'some', needs: ['contact'], rules: defaultRules('10U') }

describe('feedback hidden without an address', () => {
  beforeEach(async () => {
    await clearEverything()
    await saveTeam({ ...team })
    await db.plans.put({ id: 'p1', teamId: 't1', date: '2026-11-01', createdAt: '2026-11-01T10:00:00Z', minutes: 10, spaces: ['field'], blocks: [{ id: 'a', kind: 'drill', drillId: DRILLS[3].id, minutes: 10 }] })
  })

  it('Settings has no Send feedback card and the privacy text does not mention it', async () => {
    window.location.hash = '#/settings/about'
    render(<App />)
    await screen.findByRole('heading', { name: 'About' })
    expect(screen.queryByRole('button', { name: 'Send feedback' })).toBeNull()
    cleanup()
    window.location.hash = '#/settings/privacy'
    render(<App />)
    await screen.findByRole('heading', { name: 'Privacy' })
    expect(screen.queryByText(/Feedback is sent only/)).toBeNull()
  })

  it('the plan page has no thumbs', async () => {
    window.location.hash = '#/plan/p1'
    render(<App />)
    await screen.findByRole('list', { name: 'Practice blocks' })
    expect(screen.queryByRole('button', { name: /this plan was/ })).toBeNull()
    expect(screen.queryByText('Was this plan right?')).toBeNull()
  })
})
