import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { saveTeam, clearEverything } from './lib/db.js'
import { defaultRules } from './data/constants.js'
import { DRILLS } from './data/drills.js'
import { CUES, HUDDLES, MOMENTS, GUIDES, cuesFor } from './data/coaching.js'

describe('coach the coach content', () => {
  it('has a say-this-not-that cue for every drill type in the library', () => {
    for (const d of DRILLS) {
      const [cue] = cuesFor(d)
      expect(cue, d.id).toBeTruthy()
      expect(cue.say && cue.not && cue.why).toBeTruthy()
    }
  })

  it('always shows the same cue for a drill', () => {
    const d = DRILLS[5]
    expect(cuesFor(d)).toEqual(cuesFor(d))
    expect(cuesFor(d, 2)).toHaveLength(Math.min(2, CUES[d.category].length))
  })

  it('has short bullet huddles for both age bands', () => {
    for (const h of Object.values(HUDDLES)) {
      for (const band of ['young', 'older']) {
        expect(h[band].length).toBeGreaterThanOrEqual(3)
        expect(h[band].length).toBeLessThanOrEqual(5)
      }
    }
  })

  it('never puts "just throw strikes" style advice on the say side', () => {
    const says = [...Object.values(CUES).flat().map((c) => c.say), ...MOMENTS.flatMap((m) => m.say)]
    for (const s of says) expect(s.toLowerCase()).not.toMatch(/just throw|don’t|don't/)
  })

  it('has guides with content', () => {
    expect(GUIDES.length).toBeGreaterThanOrEqual(4)
    for (const g of GUIDES) expect(g.sections.flatMap((s) => s.bullets).length).toBeGreaterThan(2)
  })
})

describe('coach corner in the app', () => {
  beforeEach(async () => {
    await clearEverything()
    window.location.hash = ''
    await saveTeam({ name: 'Hawks', division: '12U', experience: 'new', needs: ['pitching', 'contact'], rules: defaultRules('12U') })
  })

  it('Today shows the tip on one line and a small link to Coach Corner', async () => {
    render(<App />)
    const section = (await screen.findByRole('button', { name: 'More in Coach Corner ›' })).closest('section')
    expect(section.textContent).toMatch(/Today’s tip:/)
    expect(section.textContent).not.toMatch(/Game day huddles, what to say when a kid strikes out/)
    expect(screen.queryByRole('button', { name: 'Open Coach Corner' })).toBeNull()
  })

  it('opens from Today with game day huddles and tough moments', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'More in Coach Corner ›' }))
    expect(await screen.findByRole('heading', { name: 'Game day huddles' })).toBeTruthy()
    await user.click(screen.getByText('Pre-game huddle'))
    expect(screen.getByText(/Control what you can control/)).toBeTruthy()
    await user.click(screen.getByText('When a pitcher is struggling'))
    expect(screen.getByText('“Just throw strikes!”')).toBeTruthy()
  })

  it('weaves huddle points and say-this cues into the plan', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Build practice plan' }))
    const list = await screen.findByRole('list', { name: 'Practice blocks' })
    await user.click(screen.getByText('Huddle talking points'))
    // The opener's wording rotates from practice to practice; whichever one is chosen names the focus.
    expect(screen.getAllByText(/pitching, making contact/).length).toBeGreaterThan(0)
    const first = within(list).getAllByRole('listitem')[0]
    await user.click(within(first).getAllByRole('button')[0])
    expect(within(first).getByText('Say')).toBeTruthy()
    expect(within(first).getByText('Not')).toBeTruthy()
    const items = within(list).getAllByRole('listitem')
    const last = items[items.length - 1]
    const before = last.textContent.length
    await user.click(within(last).getAllByRole('button')[0])
    // The closing wording rotates too; opening the block shows its talking points either way.
    expect(last.textContent.length).toBeGreaterThan(before)
  })
})

describe('team, settings and coach tabs', () => {
  beforeEach(async () => {
    await clearEverything()
    window.location.hash = '#/team'
    await saveTeam({ name: 'Hawks', division: '12U', experience: 'new', needs: ['pitching'], rules: defaultRules('12U') })
  })

  it('keeps team things on Team and app things in Settings, reached by the gear', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Players' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'How you practice' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Backup' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Coach profile' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    for (const h of ['Coach profile', 'Display', 'Backup', 'Privacy', 'About']) expect(await screen.findByRole('heading', { name: h })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Players' })).toBeNull()
    // Settings is not a tab, so there is no gear on it itself.
    expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull()
  })

  it('has Coach Corner as its own tab', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Coach' }))
    expect(await screen.findByRole('heading', { name: 'Game day huddles' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Coach Corner' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Coach' }).getAttribute('aria-current')).toBe('page')
  })
})
