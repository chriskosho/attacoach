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

describe('coach the coach in the app', () => {
  beforeEach(async () => {
    await clearEverything()
    window.location.hash = ''
    await saveTeam({ name: 'Hawks', division: '12U', experience: 'new', needs: ['pitching', 'contact'], rules: defaultRules('12U') })
  })

  it('opens from Today with game day huddles and tough moments', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Open Coach the Coach' }))
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
    expect(screen.getByText(/Today’s focus and why it matters: "pitching, making contact/)).toBeTruthy()
    const first = within(list).getAllByRole('listitem')[0]
    await user.click(within(first).getAllByRole('button')[0])
    expect(within(first).getByText('Say')).toBeTruthy()
    expect(within(first).getByText('Not')).toBeTruthy()
    const items = within(list).getAllByRole('listitem')
    const last = items[items.length - 1]
    await user.click(within(last).getAllByRole('button')[0])
    expect(within(last).getByText(/one thing they improved/)).toBeTruthy()
  })
})
