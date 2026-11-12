// Stage 11D: the plan page is about the plan, and Today on practice day is about pressing Start.
// One-line summary, adults through Change of plans, a folded opener, the drill first and its edit
// buttons behind one Edit button, Print inside Share, and the planning form folded on Today.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { db, saveTeam, clearEverything, setSetting } from './lib/db.js'
import { defaultRules } from './data/constants.js'
import { buildPlan, localDate } from './lib/plan.js'
import { drillById } from './data/drills.js'

const day = (offset) => localDate(new Date(Date.now() + offset * 86400000))
const team = { name: 'Blue Jays', division: '12U', experience: 'some', needs: ['grounders', 'contact', 'throwing'], rules: defaultRules('12U') }

let teamId
async function openPlan(over = {}) {
  const t = await saveTeam({ ...team })
  teamId = t.id
  await setSetting('coachName', 'Chris')
  const plan = buildPlan({ ...team, id: t.id }, { minutes: 90, adults: 3, kids: 12, spaces: ['field'], seed: 7, date: day(1), ...over })
  await db.plans.put({ ...plan, teamId: t.id })
  window.location.hash = `#/plan/${plan.id}`
  render(<App />)
  await screen.findByRole('list', { name: 'Practice blocks' })
  return plan
}
const items = () => within(screen.getByRole('list', { name: 'Practice blocks' })).getAllByRole('listitem')
const saved = (plan) => db.plans.get(plan.id)
// The first single-drill block that is not the warm-up (so moving it up and down both work).
const drillIndex = (plan) => plan.blocks.findIndex((b, i) => i > 0 && b.kind === 'drill' && i < plan.blocks.length - 1)

beforeEach(async () => {
  cleanup()
  await clearEverything()
  window.location.hash = ''
  try { window.localStorage.clear() } catch { /* ignore */ }
})

describe('plan page header', () => {
  it('is one line, with the focus folded to the first need and a count', async () => {
    const user = userEvent.setup()
    await openPlan()
    expect(document.querySelector('.plan-line').textContent).toBe('Tomorrow · 90 min · Full field · 12 kids')
    const focus = document.querySelector('details.focus-fold')
    expect(focus.querySelector('summary').textContent).toBe('Focus: Fielding ground balls +2')
    expect(focus.querySelector('summary').getAttribute('title')).toMatch(/Making contact/)
    expect(focus.open).toBe(false)
    await user.click(focus.querySelector('summary'))
    expect(focus.open).toBe(true)
    expect([...focus.querySelectorAll('li')].map((l) => l.textContent)).toEqual(['Fielding ground balls', 'Making contact', 'Throwing accuracy'])
    expect(screen.getByText('90 of 90 min')).toBeTruthy()
    // "Prepared by" stays for print only.
    expect(screen.getByText('Prepared by Coach Chris').className).toContain('print-only')
    expect(document.querySelector('details.plan-details')).toBeTruthy()
  })

  it('names the practice when it has one: "Cage" from "Cage practice"', async () => {
    await openPlan({ practiceName: 'Cage practice', spaces: ['cage', 'open'] })
    expect(document.querySelector('.plan-line').textContent).toBe('Tomorrow · 90 min · Cage · 12 kids')
  })

  it('shows the adult count on one line that opens Change of plans, where the adults stepper is', async () => {
    const user = userEvent.setup()
    const plan = await openPlan()
    expect(screen.queryByRole('group', { name: 'Adults today' })).toBe(null)
    await user.click(screen.getByRole('button', { name: /^3 adults · You (run a station|float and manage)/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Change of plans' })
    await user.click(within(sheet).getByRole('button', { name: 'Fewer: Adults today' }))
    await user.click(within(sheet).getByRole('button', { name: 'Apply changes' }))
    await waitFor(async () => expect((await saved(plan)).adults).toBe(2))
    expect(await screen.findByRole('button', { name: /^2 adults · You run a station/ })).toBeTruthy()
  })

  it('folds the opener to one line that opens to the full line and the huddle talking points', async () => {
    const user = userEvent.setup()
    const plan = await openPlan()
    const fold = document.querySelector('details.talk-fold')
    expect(fold.open).toBe(false)
    expect(fold.querySelector('summary').textContent).toBe(`Open with: ${plan.opener}`)
    await user.click(fold.querySelector('summary'))
    expect(fold.open).toBe(true)
    expect(within(fold).getByText('Huddle talking points')).toBeTruthy()
    expect(fold.querySelectorAll('.huddle-points li').length).toBeGreaterThan(1)
  })
})

describe('an open block', () => {
  it('shows the drill (Say line, steps and a link to the full drill) with its edit buttons behind Edit', async () => {
    const user = userEvent.setup()
    const plan = await openPlan()
    const i = drillIndex(plan)
    const drill = drillById(plan.blocks[i].drillId)
    const li = items()[i]
    await user.click(within(li).getAllByRole('button')[0])
    expect(li.querySelector('.say-this')).toBeTruthy()
    expect(within(li).getByText(drill.steps[0])).toBeTruthy()
    for (const name of ['Lock', 'Swap', 'Remove', 'Add break after', 'One minute more', 'Move earlier', '☆ Favorite']) expect(within(li).queryByRole('button', { name })).toBe(null)
    await user.click(within(li).getByRole('button', { name: /^Full drill/ }))
    expect(window.location.hash).toBe(`#/drill/${drill.id}`)
  })

  it('Edit reveals every old control, and each one still works', async () => {
    const user = userEvent.setup()
    const plan = await openPlan()
    const i = drillIndex(plan)
    const id = plan.blocks[i].id
    // The block being edited, wherever it has moved to: edit state follows the block, not its place.
    let li = () => items()[i]
    const now = async () => (await saved(plan)).blocks
    await user.click(within(li()).getAllByRole('button')[0])
    await user.click(within(li()).getByRole('button', { name: 'Edit' }))
    li = () => items().find((x) => within(x).queryByRole('button', { name: 'Done editing' }))
    const bar = () => within(li())

    // Minutes: and the edit buttons stay open while the plan saves and redraws.
    await user.click(bar().getByRole('button', { name: 'One minute more' }))
    await waitFor(async () => expect((await now()).find((b) => b.id === id).minutes).toBe(plan.blocks[i].minutes + 1))
    expect(bar().getByRole('button', { name: 'Done editing' })).toBeTruthy()
    await user.click(bar().getByRole('button', { name: 'One minute less' }))
    await waitFor(async () => expect((await now()).find((b) => b.id === id).minutes).toBe(plan.blocks[i].minutes))

    // Lock.
    await user.click(bar().getByRole('button', { name: 'Lock' }))
    await waitFor(async () => expect((await now()).find((b) => b.id === id).locked).toBe(true))
    expect(await screen.findByRole('button', { name: 'Rebuild the rest' })).toBeTruthy()
    await user.click(bar().getByRole('button', { name: 'Unlock' }))
    await waitFor(async () => expect((await now()).find((b) => b.id === id).locked).toBe(false))

    // Favorite and Don't suggest this.
    const drillId = plan.blocks[i].drillId
    await user.click(bar().getByRole('button', { name: '☆ Favorite' }))
    await waitFor(async () => expect((await db.teams.get(teamId)).favorites).toEqual([drillId]))
    await user.click(bar().getByRole('button', { name: "Don't suggest this" }))
    await waitFor(async () => expect((await db.teams.get(teamId)).hidden).toEqual([drillId]))

    // Move later and earlier.
    await user.click(bar().getByRole('button', { name: 'Move later' }))
    await waitFor(async () => expect((await now()).findIndex((b) => b.id === id)).toBe(i + 1))
    await user.click(bar().getByRole('button', { name: 'Move earlier' }))
    await waitFor(async () => expect((await now()).findIndex((b) => b.id === id)).toBe(i))

    // Add break after.
    await user.click(bar().getByRole('button', { name: 'Add break after' }))
    await waitFor(async () => expect((await now())[i + 1].kind).toBe('break'))

    // Swap.
    await user.click(bar().getByRole('button', { name: 'Swap' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getAllByRole('button').find((b) => b.className.includes('drill-row')))
    await waitFor(async () => expect((await now()).find((b) => b.id === id).drillId).not.toBe(drillId))

    // Remove, with Undo.
    const count = (await now()).length
    await user.click(bar().getByRole('button', { name: 'Remove' }))
    await waitFor(async () => expect((await now()).length).toBe(count - 1))
    await user.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(async () => expect((await now()).length).toBe(count))
  })

  it('a station block keeps its station minutes and per-station buttons behind Edit too', async () => {
    const user = userEvent.setup()
    const plan = await openPlan()
    const i = plan.blocks.findIndex((b) => b.kind === 'stations')
    const li = items()[i]
    await user.click(within(li).getAllByRole('button')[0])
    expect(within(li).queryByRole('group', { name: 'Minutes at each station' })).toBe(null)
    await user.click(li.querySelector('.station .slot-head'))
    expect(within(li).queryByRole('button', { name: 'Remove station' })).toBe(null)
    await user.click(within(li).getByRole('button', { name: 'Edit' }))
    expect(within(li).getByRole('group', { name: 'Minutes at each station' })).toBeTruthy()
    expect(within(li).getByRole('button', { name: 'Remove station' })).toBeTruthy()
  })
})

describe('bottom of the plan page', () => {
  it('has Add a drill and Share as buttons, with Print inside Share', async () => {
    const user = userEvent.setup()
    await openPlan()
    const row = screen.getByRole('button', { name: 'Add a drill' }).parentElement
    expect([...row.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Add a drill', 'Share'])
    expect(screen.queryByRole('button', { name: 'Print' })).toBe(null)
    await user.click(screen.getByRole('button', { name: 'Share' }))
    const sheet = await screen.findByRole('dialog', { name: 'Share this plan' })
    expect(within(sheet).getByRole('button', { name: 'Send or copy the plan' })).toBeTruthy()
    const print = vi.fn()
    window.print = print
    await user.click(within(sheet).getByRole('button', { name: 'Print' }))
    await waitFor(() => expect(print).toHaveBeenCalled())
    expect(screen.queryByRole('dialog', { name: 'Share this plan' })).toBe(null)
  })

  it('sends or copies the plan text from the Share sheet, with Prepared by in it', async () => {
    const user = userEvent.setup()
    await openPlan()
    const shareFn = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'share', { value: shareFn, configurable: true })
    await user.click(screen.getByRole('button', { name: 'Share' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Share this plan' })).getByRole('button', { name: 'Send or copy the plan' }))
    await waitFor(() => expect(shareFn).toHaveBeenCalled())
    expect(shareFn.mock.calls[0][0].text).toMatch(/Coach Chris/)
    delete navigator.share
  })

  it('Build a new one is a quiet link above Delete plan, and still asks first', async () => {
    const user = userEvent.setup()
    const plan = await openPlan()
    const link = screen.getByRole('button', { name: 'Build a new one' })
    expect(link.className).toMatch(/link-btn/)
    expect(link.nextElementSibling).toBe(screen.getByRole('button', { name: 'Delete plan' }))
    let asked = 0
    window.confirm = () => (asked++, false)
    await user.click(link)
    expect(asked).toBe(1)
    expect((await saved(plan)).seed).toBe(plan.seed)
    window.confirm = () => true
    await user.click(link)
    await waitFor(async () => expect((await saved(plan)).seed).not.toBe(plan.seed))
  })
})

describe('Today', () => {
  it('with a planned practice: Next practice, then one Plan another practice button that opens the form', async () => {
    const user = userEvent.setup()
    const t = await saveTeam({ ...team })
    const plan = buildPlan({ ...team, id: t.id }, { minutes: 60, adults: 2, kids: 10, seed: 3, date: day(0) })
    await db.plans.put({ ...plan, teamId: t.id })
    render(<App />)
    const card = (await screen.findByText('Next practice')).closest('section')
    const btn = screen.getByRole('button', { name: 'Plan another practice' })
    expect(card.compareDocumentPosition(btn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Build practice plan' })).toBe(null)
    // The Coach Corner tip comes after the button.
    const tip = screen.getByRole('button', { name: 'More in Coach Corner ›' })
    expect(btn.compareDocumentPosition(tip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await user.click(btn)
    expect(screen.getByRole('button', { name: 'Build practice plan' })).toBeTruthy()
    expect(screen.getByText(/Change today's setup/)).toBeTruthy()
  })

  it('"Plan next practice" on the Log lands on Today with the form open', async () => {
    const user = userEvent.setup()
    const t = await saveTeam({ ...team })
    const plan = buildPlan({ ...team, id: t.id }, { minutes: 60, adults: 2, kids: 10, seed: 3, date: day(0) })
    await db.plans.put({ ...plan, teamId: t.id })
    await db.debriefs.put({ id: 'g1', teamId: t.id, kind: 'game', date: day(-1), createdAt: new Date().toISOString(), ratings: { hitting: 1 }, next: ['bunting'] })
    window.location.hash = '#/log'
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Plan next practice' }))
    expect(await screen.findByRole('region', { name: 'Suggested focus' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Build practice plan' })).toBeTruthy()
  })

  it('with no plan: the form is open, as before', async () => {
    await saveTeam({ ...team })
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Build practice plan' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Plan a practice' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Plan another practice' })).toBe(null)
  })
})
