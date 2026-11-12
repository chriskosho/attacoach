// Stage 12B: first-plan line, hidden testing page, sticky Save, drills rows without the category.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { saveTeam, clearEverything, db } from './lib/db.js'
import { defaultRules } from './data/constants.js'
import { createFirstPlan } from './lib/starter.js'

const team = { name: 'Blue Jays', division: '10U', experience: 'some', needs: [], rules: defaultRules('10U') }

describe('first plan', () => {
  beforeEach(clearEverything)

  it('is one quiet line that opens both ways to make it yours', async () => {
    const user = userEvent.setup()
    const t = await saveTeam({ ...team })
    const plan = await createFirstPlan(t)
    window.location.hash = `#/plan/${plan.id}`
    render(<App />)
    const line = await screen.findByText(/Starter plan for 10U\. Make it yours/)
    expect(screen.queryByText(/This is a starter plan on the fundamentals/)).toBe(null)
    await user.click(line)
    expect(screen.getByRole('button', { name: 'Add players' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Choose skills' }))
    expect(window.location.hash).toBe(`#/setup/${t.id}`)
  })

  it('Start practice and Change of plans share the row, and the header links read the same', async () => {
    const t = await saveTeam({ ...team })
    const plan = await createFirstPlan(t)
    window.location.hash = `#/plan/${plan.id}`
    render(<App />)
    await screen.findByRole('button', { name: 'Start practice' })
    expect(screen.getByRole('button', { name: 'Change of plans' }).parentElement).toBe(screen.getByRole('button', { name: 'Start practice' }).parentElement)
    expect(screen.getByText('Date, template')).toBeTruthy()
    expect(screen.queryByText('Date and template')).toBe(null)
  })
})

describe('hidden testing page', () => {
  beforeEach(clearEverything)

  it('offers the ready-made teams at #/testing even before any team exists', async () => {
    window.location.hash = '#/testing'
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Testing tools' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Add a ready-made team' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start over and replay setup' })).toBeTruthy()
  })

  it('loads a team from it', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/testing'
    render(<App />)
    const group = await screen.findByRole('group', { name: 'Add a ready-made team' })
    await user.click(within(group).getAllByRole('button')[0])
    await screen.findByRole('navigation').catch(() => {})
    expect(await db.teams.count()).toBe(1)
  })
})

describe('Save on the recap', () => {
  beforeEach(clearEverything)

  it('sits in a sticky bar so it stays in view', async () => {
    await saveTeam({ ...team })
    window.location.hash = '#/debrief/practice'
    render(<App />)
    const save = await screen.findByRole('button', { name: 'Save' })
    expect(save.parentElement.className).toContain('save-bar')
  })

  it('is the same on the game debrief', async () => {
    await saveTeam({ ...team })
    window.location.hash = '#/debrief/game'
    render(<App />)
    const save = await screen.findByRole('button', { name: 'Save' })
    expect(save.parentElement.className).toContain('save-bar')
  })
})

describe('Drills rows', () => {
  beforeEach(clearEverything)

  it('leave the category out under a heading, and keep it in an ungrouped list', async () => {
    await saveTeam({ ...team })
    window.location.hash = '#/drills'
    render(<App />)
    await screen.findByRole('button', { name: 'Add your own drill' })
    const first = document.querySelector('.drill-group .drill-row .meta')
    const head = first.closest('section').querySelector('.drill-group-head').firstChild.textContent.trim()
    expect(first.textContent).not.toContain(head)
    expect(first.textContent).toMatch(/min/)
  })
})
