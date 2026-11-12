// The Today tab's order, the change-of-plans sheet and the plan page header.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { db, saveTeam, savePlayers, clearEverything } from './lib/db.js'
import { defaultRules } from './data/constants.js'
import { buildPlan, localDate, drillIdsInPlan } from './lib/plan.js'
import { blankPlayer } from './lib/roster.js'
import { nextPlan, planNeedingRecap } from './lib/todayRules.js'
import { describeChanges } from './lib/changes.js'
import { rebuildPlan } from './lib/plan.js'

const day = (offset) => localDate(new Date(Date.now() + offset * 86400000))
const team = { name: 'Blue Jays', division: '12U', experience: 'some', needs: ['grounders', 'contact'], rules: defaultRules('12U') }
const mk = (id, date, extra = {}) => ({ id, date, createdAt: `${date}T10:00:00Z`, focus: ['grounders'], minutes: 60, blocks: [], ...extra })

describe('which plan leads on Today', () => {
  it('is the soonest plan dated today or later', () => {
    const plans = [mk('old', '2026-01-01'), mk('later', '2999-02-01'), mk('soon', '2999-01-01')]
    expect(nextPlan(plans, '2026-06-01').id).toBe('soon')
    expect(nextPlan(plans, '2999-01-01').id).toBe('soon')
    expect(nextPlan(plans, '2999-01-02').id).toBe('later')
  })
  it('is nothing when every plan is in the past, or there are none', () => {
    expect(nextPlan([mk('old', '2026-01-01')], '2026-06-01')).toBe(null)
    expect(nextPlan([], '2026-06-01')).toBe(null)
  })
  it('takes the plan made last when two share a day', () => {
    const a = mk('a', '2999-01-01', { createdAt: '2026-01-01T10:00:00Z' })
    const b = mk('b', '2999-01-01', { createdAt: '2026-01-02T10:00:00Z' })
    expect(nextPlan([a, b], '2026-06-01').id).toBe('b')
  })
})

describe('when to ask how practice went', () => {
  const plans = [mk('p1', '2026-05-01'), mk('p2', '2026-05-20')]
  it('asks about the most recent plan when it is past and has no recap', () => {
    expect(planNeedingRecap(plans, [], '2026-06-01').id).toBe('p2')
  })
  it('does not ask when a recap is linked to it, or dated the same day', () => {
    expect(planNeedingRecap(plans, [{ kind: 'practice', planId: 'p2', date: '2026-05-21' }], '2026-06-01')).toBe(null)
    expect(planNeedingRecap(plans, [{ kind: 'practice', date: '2026-05-20' }], '2026-06-01')).toBe(null)
  })
  it('a game debrief or an older practice recap does not count', () => {
    expect(planNeedingRecap(plans, [{ kind: 'game', date: '2026-05-20' }, { kind: 'practice', planId: 'p1', date: '2026-05-01' }], '2026-06-01').id).toBe('p2')
  })
  it('does not ask about today or the future, or with no plans', () => {
    expect(planNeedingRecap([...plans, mk('p3', '2026-06-01')], [], '2026-06-01')).toBe(null)
    expect(planNeedingRecap([], [], '2026-06-01')).toBe(null)
  })
})

describe('explaining a change of plans', () => {
  const t = { ...team, rules: defaultRules('12U') }
  const make = (seed) => buildPlan(t, { minutes: 90, adults: 3, kids: 12, spaces: ['field'], seed, date: '2026-04-01' })

  it('names a drill that needs a full field when practice moves indoors', () => {
    let found = false
    for (let seed = 1; seed <= 30 && !found; seed++) {
      const before = make(seed)
      const after = rebuildPlan(t, before, { spaces: ['gym'] })
      const c = describeChanges(t, before, after)
      for (const d of c.dropped) if (d.reason === 'it needs a full field') found = true
      if (c.dropped.length) {
        expect(c.lines[0]).toMatch(/^Swapped /)
        expect(c.lines[1]).toMatch(/^Kept \d+ of \d+ drills/)
        expect(c.lines).toHaveLength(2)
      }
    }
    expect(found).toBe(true)
  })

  it('says every drill still fits when nothing was dropped', () => {
    const before = make(3)
    const c = describeChanges(t, before, { ...before, kids: 10, adults: 2 })
    expect(c.dropped).toEqual([])
    expect(c.lines[0]).toBe('Every drill still fits.')
    expect(c.lines[1]).toMatch(/10 kids and 2 adults/)
  })

  it('compares drills in stations too, and counts what was kept', () => {
    const before = make(5)
    const after = rebuildPlan(t, before, { adults: 1, kids: 5 })
    const c = describeChanges(t, before, after)
    expect(c.total).toBe(new Set(drillIdsInPlan(before)).size)
    expect(c.kept + c.dropped.length).toBe(c.total)
  })
})

async function setup(plans = [], { players = 0 } = {}) {
  const t = await saveTeam({ ...team })
  if (players) await savePlayers(t.id, Array.from({ length: players }, (_, i) => ({ ...blankPlayer(), first: `P${i}` })))
  for (const p of plans) await db.plans.put({ ...p, teamId: t.id })
  return t
}

beforeEach(async () => {
  cleanup()
  await clearEverything()
  window.location.hash = ''
  try { window.localStorage.clear() } catch { /* ignore */ }
})

describe('the Today tab', () => {
  it('leads with Next practice for a plan today, with Start practice and Open plan', async () => {
    const user = userEvent.setup()
    await setup([mk('p1', day(0), { focus: ['contact'], minutes: 75, blocks: [{ id: 'b', kind: 'huddle', minutes: 75 }] })])
    render(<App />)
    const card = (await screen.findByText('Next practice')).closest('section')
    expect(within(card).getByText(/Today, 75 minutes/)).toBeTruthy()
    expect(within(card).getByText(/Focus: /)).toBeTruthy()
    // The build form folds into one button after it (Stage 11D), and opens on a tap.
    expect(document.querySelector('[aria-labelledby="build-title"]')).toBe(null)
    const more = screen.getByRole('button', { name: 'Plan another practice' })
    expect(card.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await user.click(more)
    const form = document.querySelector('[aria-labelledby="build-title"]')
    expect(within(form).getByRole('heading', { name: 'Plan another practice' })).toBeTruthy()
    expect(card.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await user.click(within(card).getByRole('button', { name: 'Start practice' }))
    expect(window.location.hash).toBe('#/run/p1')
  })

  it('Open plan goes to the plan', async () => {
    const user = userEvent.setup()
    await setup([mk('p1', day(0), { blocks: [{ id: 'b', kind: 'huddle', minutes: 60 }] })])
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Open plan' }))
    expect(window.location.hash).toBe('#/plan/p1')
  })

  it('has no Next practice card for plans in the past, and the form comes first', async () => {
    await setup([mk('p1', day(-3))])
    render(<App />)
    await screen.findByText('Latest plan')
    expect(screen.queryByText('Next practice')).toBe(null)
    const sections = [...document.querySelectorAll('main section')].filter((x) => x.getAttribute('aria-label') !== 'Your name')
    expect(sections[0].textContent).toMatch(/Plan a practice/)
  })

  it('asks "How did it go?" under a past plan with no recap, and not once it has one', async () => {
    const user = userEvent.setup()
    await setup([mk('p1', day(-3))])
    render(<App />)
    await screen.findByText('Latest plan')
    const link = await screen.findByRole('button', { name: '2-minute recap' })
    expect(screen.getByText(/How did it go\?/)).toBeTruthy()
    await user.click(link)
    expect(window.location.hash).toBe('#/debrief/practice/p1')
  })

  it('stays quiet when the past plan already has a recap', async () => {
    const t = await setup([mk('p1', day(-3))])
    await db.debriefs.put({ id: 'd1', teamId: t.id, kind: 'practice', planId: 'p1', date: day(-3), ratings: {}, next: [] })
    render(<App />)
    await screen.findByText('Latest plan')
    await waitFor(() => expect(screen.queryByText(/How did it go\?/)).toBe(null))
  })

  it('keeps the form to the practice, the date and one build button, with the rest under one closed section', async () => {
    await setup([])
    render(<App />)
    const build = await screen.findByRole('button', { name: 'Build practice plan' })
    expect(build).toBeTruthy()
    const details = document.querySelector('details.day-setup')
    expect(details.open).toBe(false)
    expect(details.querySelector('summary').textContent).toMatch(/Change today's setup/)
    expect(details.querySelector('summary').textContent).toMatch(/\d+ min, \d adults?, \d+ kids, Full field/)
    // Everything that was on the form is still inside it.
    for (const name of ['Practice length in minutes', 'Spaces today', 'Equipment today']) expect(within(details).getByRole('group', { name })).toBeTruthy()
    expect(within(details).getByRole('group', { name: 'Kids expected' })).toBeTruthy()
    expect(within(details).getByText("Today's focus")).toBeTruthy()
  })

  it('builds a plan in one tap for a new coach', async () => {
    const user = userEvent.setup()
    await setup([])
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Build practice plan' }))
    await screen.findByRole('list', { name: 'Practice blocks' })
    expect(await db.plans.count()).toBe(1)
  })

  it('starts Kids expected from the roster, even a small one', async () => {
    await setup([], { players: 6 })
    render(<App />)
    await screen.findByRole('button', { name: 'Build practice plan' })
    expect(document.querySelector('details.day-setup summary').textContent).toMatch(/6 kids/)
  })
})

async function openPlan(over = {}) {
  const t = await saveTeam({ ...team })
  const plan = buildPlan({ ...team, id: t.id }, { minutes: 90, adults: 3, kids: 12, spaces: ['field'], seed: 7, date: day(1), ...over })
  await db.plans.put({ ...plan, teamId: t.id })
  window.location.hash = `#/plan/${plan.id}`
  render(<App />)
  await screen.findByRole('list', { name: 'Practice blocks' })
  return plan
}

describe('the plan page', () => {
  it('leads with the summary, keeps the date behind a tap, and puts Delete last and quiet', async () => {
    const user = userEvent.setup()
    await openPlan()
    expect(document.querySelector('.plan-line').textContent).toMatch(/ · 90 min · Full field · 12 kids$/)
    const details = document.querySelector('details.plan-details')
    expect(details.open).toBe(false)
    expect(within(details).getByLabelText('Practice date')).toBeTruthy()
    const del = screen.getByRole('button', { name: 'Delete plan' })
    expect(del.className).toMatch(/quiet-delete/)
    const main = document.querySelector('main')
    expect(main.lastElementChild).toBe(del)
    // It still asks first.
    let asked = 0
    window.confirm = () => (asked++, false)
    await user.click(del)
    expect(asked).toBe(1)
    expect(await db.plans.count()).toBe(1)
    window.confirm = () => true
    await user.click(del)
    await waitFor(async () => expect(await db.plans.count()).toBe(0))
  })
})

describe('change of plans', () => {
  const sheet = () => screen.getByRole('dialog', { name: 'Change of plans' })
  const press = (name) => screen.getByRole('button', { name })

  it('takes 5 kids and 1 adult in one sheet and one tap, says what changed, and undoes once', async () => {
    const user = userEvent.setup()
    const plan = await openPlan()
    await user.click(press('Change of plans'))
    const s = within(sheet())
    expect(s.getByRole('button', { name: 'Short on kids' })).toBeTruthy()
    expect(s.getByRole('button', { name: "I'm the only adult" })).toBeTruthy()
    expect(s.getByRole('button', { name: 'Moved indoors' })).toBeTruthy()
    expect(s.getByRole('button', { name: 'Apply changes' }).disabled).toBe(true)
    for (let i = 0; i < 7; i++) await user.click(s.getByRole('button', { name: 'Fewer: Kids today' }))
    await user.click(s.getByRole('button', { name: "I'm the only adult" }))
    await user.click(s.getByRole('button', { name: 'Apply changes' }))
    await waitFor(async () => expect(await db.plans.get(plan.id)).toMatchObject({ kids: 5, adults: 1 }))
    expect(screen.queryByRole('dialog')).toBe(null)
    expect((await screen.findAllByText(/Every drill still fits|Swapped|Kept \d+ of/)).length).toBeGreaterThan(0)
    expect(screen.getByText(/Kept \d+ of \d+ drills|adjusted for 5 kids and 1 adult/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(async () => expect(await db.plans.get(plan.id)).toMatchObject({ kids: 12, adults: 3 }))
    expect(screen.queryByRole('button', { name: 'Undo' })).toBe(null)
  })

  it('"Short on kids" halves the team, and the coach can still change the number', async () => {
    const user = userEvent.setup()
    const plan = await openPlan()
    await user.click(press('Change of plans'))
    await user.click(within(sheet()).getByRole('button', { name: 'Short on kids' }))
    expect(within(sheet()).getByRole('group', { name: 'Kids today' }).textContent).toMatch(/6/)
    await user.click(within(sheet()).getByRole('button', { name: 'Apply changes' }))
    await waitFor(async () => expect((await db.plans.get(plan.id)).kids).toBe(6))
  })

  it('"I\'m the only adult" sets one adult', async () => {
    const user = userEvent.setup()
    const plan = await openPlan()
    await user.click(press('Change of plans'))
    await user.click(within(sheet()).getByRole('button', { name: "I'm the only adult" }))
    await user.click(within(sheet()).getByRole('button', { name: 'Apply changes' }))
    await waitFor(async () => expect(await db.plans.get(plan.id)).toMatchObject({ adults: 1, kids: 12 }))
  })

  it('"Moved indoors" moves the plan inside and explains what left', async () => {
    const user = userEvent.setup()
    const plan = await openPlan()
    await user.click(press('Change of plans'))
    await user.click(within(sheet()).getByRole('button', { name: 'Moved indoors' }))
    await user.click(within(sheet()).getByRole('button', { name: 'Apply changes' }))
    await waitFor(async () => expect((await db.plans.get(plan.id)).spaces).toEqual(['gym']))
    expect(await screen.findByText(/Gym or indoors/)).toBeTruthy()
    const status = screen.getAllByRole('status').map((n) => n.textContent).join(' ')
    expect(status).toMatch(/Swapped .*: it needs|Every drill still fits/)
    expect(status).toMatch(/Kept \d+ of \d+ drills|adjusted for/)
    // The rebuilt plan keeps its date, practice length and focus.
    const after = await db.plans.get(plan.id)
    expect(after).toMatchObject({ date: plan.date, minutes: plan.minutes })
  })
})
