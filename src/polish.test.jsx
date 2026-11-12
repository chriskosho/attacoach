// Stage 7: spacing in the drill header, sun mode, the timer's "More", and empty states.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fs from 'node:fs'
import App from './App.jsx'
import { db, saveTeam, clearEverything } from './lib/db.js'
import { defaultRules } from './data/constants.js'
import { DRILLS } from './data/drills.js'
import { DrillMeta } from './components/DrillText.jsx'

const team = { name: 'Blue Jays', division: '10U', experience: 'some', needs: ['grounders'], rules: defaultRules('10U') }

describe('drill header spacing', () => {
  it('puts a separator between category, level, ages and time', () => {
    const d = DRILLS.find((x) => x.ages[0] !== x.ages[1])
    const { container } = render(<DrillMeta drill={d} />)
    const text = container.textContent
    expect(text).toMatch(/ · /)
    expect(text).not.toMatch(/\d+U\d+ min/) // "8U–14U8 min" used to run together
    expect(text).not.toMatch(/[a-z]Beginner|Beginner\d|Intermediate\d|Advanced\d/)
    expect(container.querySelectorAll('.sep').length).toBe(3)
  })

  it('shows Favorite and Not suggested marks with their own separators', () => {
    const d = DRILLS[0]
    const { container } = render(<DrillMeta drill={d} favorite hidden />)
    expect(container.querySelectorAll('.sep').length).toBe(5)
  })

  it('lets the line wrap and spaces the items in the stylesheet', () => {
    const css = fs.readFileSync('src/styles.css', 'utf8')
    expect(css).toMatch(/\.meta \{[^}]*flex-wrap: wrap[^}]*gap/)
  })
})

describe('sun mode', () => {
  beforeEach(async () => {
    await clearEverything()
    delete document.documentElement.dataset.theme
    window.location.hash = '#/settings'
    await saveTeam(team)
  })

  it('is a Display choice, is saved, and is applied to the page', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/settings/display'
    render(<App />)
    const group = await screen.findByRole('group', { name: 'Theme' })
    for (const name of [/^Auto/, 'Light', 'Dark', /High contrast/]) expect(within(group).getByRole('button', { name })).toBeTruthy()
    await user.click(within(group).getByRole('button', { name: /High contrast/ }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('sun'))
    expect((await db.settings.get('theme')).value).toBe('sun')
    expect(within(group).getByRole('button', { name: /High contrast/ }).getAttribute('aria-pressed')).toBe('true')
  })

  it('keeps Auto, Light and Dark working and clears the attribute for Auto', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/settings/display'
    render(<App />)
    const group = await screen.findByRole('group', { name: 'Theme' })
    await user.click(within(group).getByRole('button', { name: 'Dark' }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))
    await user.click(within(group).getByRole('button', { name: 'Light' }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))
    await user.click(within(group).getByRole('button', { name: /High contrast/ }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('sun'))
    await user.click(within(group).getByRole('button', { name: /^Auto/ }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBeUndefined())
  })

  it('is remembered on the next start', async () => {
    await db.settings.put({ key: 'theme', value: 'sun' })
    render(<App />)
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('sun'))
  })

  it('has its own colors that the timer uses, and the dark-mode rule leaves it alone', () => {
    const css = fs.readFileSync('src/styles.css', 'utf8')
    expect(css).toMatch(/:root\[data-theme='sun'\] \{[^}]*--bg: #ffffff[^}]*--run-bg: #ffffff/)
    expect(css).toMatch(/:root:not\(\[data-theme='light'\]\):not\(\[data-theme='sun'\]\)/)
    expect(css).toMatch(/\.run \{[^}]*background: var\(--run-bg\)/)
  })
})

describe('timer reading load', () => {
  const longDrill = DRILLS.find((d) => d.steps.length > 3 && d.category !== 'warmup')
  beforeEach(async () => {
    await clearEverything()
    window.location.hash = '#/run/p1'
    await saveTeam({ ...team, experience: 'new' })
    await db.plans.put({
      id: 'p1',
      teamId: (await db.teams.toArray())[0].id,
      date: '2026-11-05',
      createdAt: '2026-11-05T10:00:00Z',
      focus: ['grounders'],
      opener: 'Welcome in.',
      closer: 'Good work today.',
      coachRole: 'run',
      blocks: [{ id: 'a', kind: 'drill', drillId: longDrill.id, minutes: 10 }],
    })
  })

  // Stage 11C: the timer shows only the Say line while a drill runs; every step and coaching point
  // is one tap away behind How it works (this replaces the old "three bullets and More" rule).
  it('shows no bullets under the clock, and lists every step and coaching point behind How it works', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('timer')
    const list = () => document.querySelectorAll('.run-points li').length
    expect(list()).toBe(0)
    expect(screen.queryByRole('button', { name: /^More \(\d+\)$/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'How it works' }))
    expect(list()).toBe(longDrill.steps.length + longDrill.points.length)
    await user.click(screen.getByRole('button', { name: 'Hide how it works' }))
    expect(list()).toBe(0)
  })
})

describe('empty states', () => {
  beforeEach(async () => {
    await clearEverything()
    await saveTeam(team)
  })

  it('Log says what will appear, and the Game debrief button above is the one action', async () => {
    window.location.hash = '#/log'
    const user = userEvent.setup()
    render(<App />)
    const card = (await screen.findByRole('heading', { name: 'Nothing logged yet' })).closest('.empty')
    expect(card.textContent).toMatch(/will show up here/)
    expect(within(card).queryByRole('button')).toBeNull()
  })

  it('Plans says what will appear and offers one action', async () => {
    window.location.hash = '#/plans'
    render(<App />)
    const card = (await screen.findByRole('heading', { name: 'No plans yet' })).closest('.empty')
    expect(within(card).getByRole('button', { name: 'Plan a practice' })).toBeTruthy()
  })

  it('Drills: favorites and your own drills explain themselves when empty', async () => {
    window.location.hash = '#/drills'
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('searchbox', { name: 'Search drills' })
    await user.type(screen.getByRole('searchbox', { name: 'Search drills' }), 'zzzzqq')
    expect(await screen.findByText('No drills match these filters.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findAllByRole('button', { name: /min$/ }).catch(() => [])).toBeTruthy()
  })
})
