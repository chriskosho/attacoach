// Stage 12D: one fold style, one link style, focus wording, and the smaller notes.
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { db, saveTeam, clearEverything } from './lib/db.js'
import { defaultRules } from './data/constants.js'
import { buildPlan, localDate } from './lib/plan.js'
import { focusShort } from './components/Today.jsx'

const css = fs.readFileSync('src/styles.css', 'utf8')
const team = { name: 'Blue Jays', division: '10U', experience: 'some', needs: ['grounders', 'contact', 'throwing', 'bunting', 'baserunning'], rules: defaultRules('10U') }
const reset = async () => {
  await clearEverything()
  window.localStorage.clear()
}
async function withPlan(over = {}) {
  const t = await saveTeam({ ...team })
  const plan = { ...buildPlan(t, { minutes: 60, adults: 2, kids: 12, date: localDate(), seed: 1 }), teamId: t.id, ...over }
  await db.plans.put(plan)
  return { t, plan }
}
// Every real fold toggles from its summary, and its chevron class list is the shared one.
async function toggles(user, summary) {
  const d = summary.closest('details')
  expect(d.open).toBe(false)
  await user.click(summary)
  expect(d.open).toBe(true)
  await user.click(summary)
  expect(d.open).toBe(false)
  return d
}

describe('one fold style', () => {
  beforeEach(reset)

  it('Today: "Change today\'s setup" is a fold with its summary line under the label', async () => {
    const user = userEvent.setup()
    await saveTeam({ ...team })
    window.location.hash = '#/today'
    render(<App />)
    const summary = (await screen.findByText("Change today's setup")).closest('summary')
    const d = await toggles(user, summary)
    expect(d.className).toContain('fold')
    expect(summary.querySelector('.fold-text .small')).toBeTruthy()
  })

  it('Coach tab items are folds with the short "when" line under the title', async () => {
    const user = userEvent.setup()
    await saveTeam({ ...team })
    window.location.hash = '#/coach'
    render(<App />)
    const summary = (await screen.findByText('Pre-game huddle')).closest('summary')
    const d = await toggles(user, summary)
    expect(d.className).toContain('fold')
    const text = summary.querySelector('.fold-text')
    expect(text.firstChild.textContent).toBe('Pre-game huddle')
    expect(text.querySelector('.small').textContent.length).toBeGreaterThan(5)
  })

  it('"Open with" opens from anywhere on the bar, including its label and its line', async () => {
    const user = userEvent.setup()
    await withPlan()
    window.location.hash = `#/plan/${(await db.plans.toArray())[0].id}`
    render(<App />)
    const label = await screen.findByText('Open with:')
    const d = label.closest('details')
    expect(d.className).toContain('fold')
    expect(label.closest('summary')).toBe(d.querySelector('summary'))
    await user.click(label)
    expect(d.open).toBe(true)
    await user.click(d.querySelector('.talk-line'))
    expect(d.open).toBe(false)
    await user.click(d.querySelector('summary'))
    expect(d.open).toBe(true)
  })

  it('the recap ratings and the Settings folds open and close with their summary', async () => {
    const user = userEvent.setup()
    await saveTeam({ ...team })
    window.location.hash = '#/debrief/practice'
    const { unmount } = render(<App />)
    await toggles(user, (await screen.findByText('Rate each area (optional)')).closest('summary'))
    unmount()
    window.location.hash = '#/settings/backup'
    const r2 = render(<App />)
    await toggles(user, (await screen.findByText('About backups')).closest('summary'))
    r2.unmount()
    window.location.hash = '#/settings/privacy'
    render(<App />)
    await toggles(user, (await screen.findByText(/No ads, no tracking\. Your data stays/)).closest('summary'))
  })

  it('the stylesheet gives every fold 44 px, a › on the right and a quarter turn when open', () => {
    expect(css).toMatch(/\.fold summary, \.day-setup summary, \.coach-item summary, \.talk-fold summary[^{]*\{[^}]*min-height: 44px/)
    expect(css).toMatch(/\.coach-item summary::after[^{]*\{[^}]*content: '›'; margin-left: auto/)
    expect(css).toMatch(/\.coach-item\[open\] > summary::after[^{]*\{[^}]*rotate\(90deg\)/)
  })
})

describe('one link style', () => {
  it('uses one rule for every text link, with Delete plan staying red', () => {
    for (const sel of ['.link-btn', '.link-row', '.plan-sub summary', '.starter-line summary']) expect(css).toContain(sel)
    expect(css).toMatch(/\.link-btn, \.link-row[^{]*\{[^}]*color: var\(--accent\)[^}]*text-decoration: underline/)
    expect(css).toMatch(/\.link-btn\.quiet-delete \{ color: var\(--warn\)/)
  })

  it('the links named in the stage all carry link-btn', async () => {
    await reset()
    const { plan } = await withPlan({ finishedAt: new Date().toISOString() })
    window.location.hash = `#/plan/${plan.id}`
    render(<App />)
    expect((await screen.findByRole('button', { name: 'Build a new one' })).className).toContain('link-btn')
    expect(screen.getByRole('button', { name: 'Delete plan' }).className).toContain('quiet-delete')
  })
})

describe('focus wording', () => {
  it('shows the first focus and how many more, the same as the plan page', () => {
    expect(focusShort(['contact', 'grounders', 'throwing', 'bunting', 'baserunning'])).toBe('Making contact +4')
    expect(focusShort(['contact'])).toBe('Making contact')
    expect(focusShort([])).toBe('')
  })

  it("Today's Next practice card matches the plan page's Focus line", async () => {
    await reset()
    const { plan } = await withPlan({ focus: ['contact', 'grounders', 'throwing', 'bunting', 'baserunning'] })
    window.location.hash = '#/today'
    const { unmount } = render(<App />)
    const card = (await screen.findByRole('heading', { name: /minutes/ })).closest('section')
    expect(card.textContent).toContain('Focus: Making contact +4')
    unmount()
    window.location.hash = `#/plan/${plan.id}`
    render(<App />)
    expect((await screen.findByText('Focus: Making contact +4')).textContent).toBe('Focus: Making contact +4')
  })
})

describe('smaller notes', () => {
  beforeEach(reset)

  it('station rows say Details › and Hide', async () => {
    const user = userEvent.setup()
    const { plan } = await withPlan()
    const stations = { id: 's', kind: 'stations', stations: plan.blocks.filter((b) => b.drillId).slice(0, 2).map((b) => b.drillId), stationMinutes: 5, groups: [4, 4], staff: [{ type: 'run', who: 'coach' }, { type: 'kids' }] }
    await db.plans.put({ ...plan, blocks: [stations, { id: 'h', kind: 'huddle', minutes: 4 }] })
    window.location.hash = `#/run/${plan.id}`
    render(<App />)
    const head = (await screen.findAllByText('Details ›'))[0]
    expect(screen.queryByText('Open')).toBe(null)
    await user.click(head)
    expect(screen.getAllByText('Hide').length).toBe(1)
  })

  it('Change of plans keeps Apply in a sticky bar at the bottom of the sheet', async () => {
    const user = userEvent.setup()
    const { plan } = await withPlan()
    window.location.hash = `#/plan/${plan.id}`
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Change of plans' }))
    const apply = within(screen.getByRole('dialog')).getByRole('button', { name: 'Apply changes' })
    expect(apply.parentElement.className).toBe('sheet-actions')
    expect(css).toMatch(/\.sheet-actions \{ position: sticky; bottom: -20px/)
  })

  it('level badges are 14 px', () => {
    expect(css).toMatch(/\.level \{ display: inline-block; font-size: 14px/)
  })
})
