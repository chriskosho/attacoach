// Making it theirs: favorites, hidden drills, the coach's own drills, locked blocks and templates.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { db, saveTeam, clearEverything, exportBackup, importBackup, saveCustomDrill, saveTemplate, deleteCustomDrill } from './lib/db.js'
import { defaultRules } from './data/constants.js'
import { drillById, setCustomDrills, allDrills, DRILLS } from './data/drills.js'
import { buildPlan, rebuildPlan, planFromTemplate, drillIdsInPlan, eligibleDrills, alternatives, totalMinutes, isStaple, blockMinutes } from './lib/plan.js'
import { blockTitle } from './lib/share.js'
import { scenarioPractices, runSeason } from './test/planSim.js'

const sim = scenarioPractices().find((x) => x.sc.id === 'rec-10u') ?? scenarioPractices()[2]
const seasonWith = (teamPatch) => runSeason({ ...sim, team: { ...sim.team, ...teamPatch } }, 40)
const appearances = (plans, id) => plans.filter((p) => drillIdsInPlan(p).includes(id)).length

afterEach(() => setCustomDrills([]))

describe('favorites and hidden drills in the planner', () => {
  const before = seasonWith({})
  const counts = {}
  for (const p of before) for (const id of new Set(drillIdsInPlan(p))) counts[id] = (counts[id] ?? 0) + 1

  it('never picks a hidden drill: 0 of 40 plans', () => {
    const common = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const regular = common.find(([id]) => !isStaple(drillById(id)))[0]
    const staple = common.find(([id]) => isStaple(drillById(id)))?.[0]
    expect(counts[regular]).toBeGreaterThan(5)
    const hidden = [regular, staple].filter(Boolean)
    const after = seasonWith({ hidden })
    for (const id of hidden) expect(appearances(after, id), id).toBe(0)
    for (const p of after) expect(p.blocks.length).toBeGreaterThan(3)
  })

  it('a favorite comes up more often, but not every practice', () => {
    const some = Object.entries(counts).filter(([id, n]) => n >= 2 && n <= 12 && !isStaple(drillById(id)))
    expect(some.length).toBeGreaterThan(0)
    let more = 0
    for (const [id, n] of some.slice(0, 5)) {
      const after = appearances(seasonWith({ favorites: [id] }), id)
      expect(after, id).toBeLessThan(40)
      expect(after, id).toBeGreaterThanOrEqual(n)
      if (after > n) more++
    }
    expect(more).toBeGreaterThan(0)
  })

  it('swap suggestions leave hidden drills out, and adding by hand can still use them', () => {
    const team = { ...sim.team, hidden: ['funnel-grounders'] }
    expect(eligibleDrills(team).some((d) => d.id === 'funnel-grounders')).toBe(false)
    expect(eligibleDrills(team, { includeHidden: true }).some((d) => d.id === 'funnel-grounders')).toBe(fitsAnyway(team))
    const plan = buildPlan(team, { minutes: 90, seed: 3 })
    const any = drillIdsInPlan(plan)[2]
    expect(alternatives(team, any, plan).some((d) => d.id === 'funnel-grounders')).toBe(false)
  })
})
const fitsAnyway = (team) => eligibleDrills({ ...team, hidden: [] }).some((d) => d.id === 'funnel-grounders')

const row = (over = {}) => ({ id: 'my-1', name: 'Two-ball relay', category: 'game', minutes: 8, needs: ['grounders', 'throwing'], where: ['field', 'open'], group: 'team', steps: ['Two lines.', 'First done wins.'], ...over })

describe('your own drills in the planner', () => {
  it('can be picked by the planner like any drill that fits', () => {
    setCustomDrills([row()])
    const team = { ...sim.team, needs: ['grounders', 'throwing'] }
    const plans = runSeason({ ...sim, team }, 40)
    expect(appearances(plans, 'my-1')).toBeGreaterThan(0)
    expect(allDrills()).toHaveLength(DRILLS.length + 1)
  })

  it('does not fit a space it was not made for', () => {
    setCustomDrills([row({ where: ['gym'] })])
    const plans = Array.from({ length: 20 }, (_, i) => buildPlan({ ...sim.team, needs: ['grounders'] }, { minutes: 90, spaces: ['field'], seed: i + 1 }))
    // A field practice has plenty to choose from, so a gym-only drill is not needed.
    expect(plans.filter((p) => drillIdsInPlan(p).includes('my-1')).length).toBe(0)
  })

  it('shows edits, and a deleted one keeps its name in saved plans without being picked again', () => {
    setCustomDrills([row()])
    const block = { id: 'b', kind: 'drill', drillId: 'my-1', minutes: 8 }
    expect(blockTitle(block)).toBe('Two-ball relay')
    setCustomDrills([row({ name: 'Three-ball relay' })])
    expect(blockTitle(block)).toBe('Three-ball relay')
    setCustomDrills([row({ name: 'Three-ball relay', deleted: true })])
    expect(blockTitle(block)).toBe('Three-ball relay (deleted drill)')
    expect(eligibleDrills(sim.team).some((d) => d.id === 'my-1')).toBe(false)
    expect(allDrills().some((d) => d.id === 'my-1')).toBe(false)
  })
})

describe('locking blocks', () => {
  const team = { ...sim.team, id: 't' }
  it('locked blocks keep their drill, minutes and place through a rebuild', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const plan = buildPlan(team, { minutes: 90, adults: 2, kids: 12, seed, date: '2026-04-01' })
      const picks = [1, Math.floor(plan.blocks.length / 2)].filter((i) => plan.blocks[i].kind !== 'break')
      const locked = { ...plan, blocks: plan.blocks.map((b, i) => (picks.includes(i) ? { ...b, locked: true } : b)) }
      const after = rebuildPlan(team, locked, { seed: seed + 100 })
      for (const i of picks) expect(after.blocks[i], `seed ${seed} block ${i}`).toEqual(locked.blocks[i])
      const ids = drillIdsInPlan(after)
      expect(new Set(ids).size).toBe(ids.length)
      expect(totalMinutes(after)).toBe(90)
      expect(after.blocks[after.blocks.length - 1].kind).toBe('huddle')
    }
  })

  it('keeps a locked closing huddle last, and one warm-up when the warm-up is locked', () => {
    const plan = buildPlan(team, { minutes: 75, seed: 9, date: '2026-04-01' })
    const blocks = plan.blocks.map((b, i) => (i === 0 || b.kind === 'huddle' ? { ...b, locked: true } : b))
    const after = rebuildPlan(team, { ...plan, blocks }, { seed: 77 })
    expect(after.blocks[0]).toEqual(blocks[0])
    expect(after.blocks.at(-1)).toEqual(blocks.at(-1))
    const warmups = after.blocks.filter((b) => b.kind === 'drill' && drillById(b.drillId)?.category === 'warmup')
    expect(warmups).toHaveLength(1)
  })
})

describe('templates', () => {
  const team = { ...sim.team, id: 't' }
  it('keeps the blocks and minutes, and re-fits stations to a different number of kids', () => {
    let plan
    for (let seed = 1; seed < 30 && !plan; seed++) {
      const p = buildPlan(team, { minutes: 90, adults: 3, kids: 14, seed, date: '2026-04-01' })
      if (p.blocks.some((b) => b.kind === 'stations' && b.stations.length >= 3)) plan = p
    }
    expect(plan).toBeTruthy()
    const template = { id: 'tpl', name: 'Tuesday', minutes: plan.minutes, focus: plan.focus, blocks: plan.blocks }
    const small = planFromTemplate(team, template, { adults: 1, kids: 5, date: '2026-05-01', seed: 4 })
    expect(small.minutes).toBe(plan.minutes)
    expect(totalMinutes(small)).toBe(totalMinutes(plan))
    expect(small.kids).toBe(5)
    expect(small.blocks.map((b) => b.kind === 'stations' ? 'stations' : b.drillId ?? b.kind).length).toBe(plan.blocks.length)
    for (const b of small.blocks.filter((x) => x.kind === 'stations')) {
      expect(b.groups.reduce((a, c) => a + c, 0)).toBe(5)
      expect(b.stations.length).toBeLessThanOrEqual(2)
      expect(b.staff.filter((s) => s.type === 'run').length).toBeLessThanOrEqual(1)
    }
    const big = planFromTemplate(team, template, { adults: 3, kids: 14, date: '2026-05-01', seed: 4 })
    expect(drillIdsInPlan(big)).toEqual(drillIdsInPlan(plan))
    for (const b of big.blocks.filter((x) => x.kind === 'stations')) expect(b.groups.reduce((a, c) => a + c, 0)).toBe(14)
    expect(new Set(big.blocks.map((b) => b.id)).size).toBe(big.blocks.length)
    expect(big.blocks.every((b, i) => b.id !== plan.blocks[i].id)).toBe(true)
  })
})

describe('backup', () => {
  beforeEach(async () => {
    cleanup()
    await clearEverything()
  })
  it('round-trips favorites, hidden drills, your own drills and templates', async () => {
    const t = await saveTeam({ name: 'A', division: '10U', experience: 'some', needs: ['grounders'], rules: defaultRules('10U'), favorites: ['funnel-grounders'], hidden: ['alligator'] })
    await saveCustomDrill(row({ id: undefined }))
    const plan = buildPlan(t, { minutes: 60, seed: 2 })
    await db.plans.put(plan)
    await saveTemplate(plan, 'Short day')
    const data = JSON.parse(JSON.stringify(await exportBackup()))
    expect(data.version).toBe(5)
    await clearEverything()
    const r = await importBackup(data)
    expect(r).toMatchObject({ teams: 1, plans: 1, customDrills: 1, templates: 1 })
    const back = await db.teams.get(t.id)
    expect(back.favorites).toEqual(['funnel-grounders'])
    expect(back.hidden).toEqual(['alligator'])
    expect((await db.customDrills.toArray())[0].name).toBe('Two-ball relay')
    expect((await db.templates.toArray())[0]).toMatchObject({ name: 'Short day', teamId: t.id })
  })
  it('restores an older backup that has none of these', async () => {
    const t = { id: 'old', name: 'Hawks', division: '10U', experience: 'some', needs: [], rules: defaultRules('10U') }
    const r = await importBackup({ format: 'attacoach-backup', version: 4, teams: [t], plans: [], debriefs: [], players: [] })
    expect(r).toMatchObject({ teams: 1, customDrills: 0, templates: 0 })
    expect(await db.customDrills.count()).toBe(0)
  })
})

// ---------------------------------------------------------------- On screen
const team = { name: 'Blue Jays', division: '10U', experience: 'some', needs: ['grounders', 'contact'], rules: defaultRules('10U'), sport: 'baseball' }

beforeEach(async () => {
  cleanup()
  await clearEverything()
  window.location.hash = ''
  try { window.localStorage.clear() } catch { /* ignore */ }
})

describe('on screen', () => {
  it('a new team sees the Drills tab as before, plus Add your own drill', async () => {
    await saveTeam({ ...team })
    window.location.hash = '#/drills'
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Add your own drill' })).toBeTruthy()
    expect(screen.queryByRole('combobox', { name: 'Show' })).toBe(null)
    expect(document.querySelector('.mark')).toBe(null)
  })

  it('favorites and hides from the drill page, filters by them, and un-hides from the Drills tab', async () => {
    const user = userEvent.setup()
    const t = await saveTeam({ ...team })
    window.location.hash = '#/drill/funnel-grounders'
    render(<App />)
    await user.click(await screen.findByRole('button', { name: '☆ Favorite' }))
    await waitFor(async () => expect((await db.teams.get(t.id)).favorites).toEqual(['funnel-grounders']))
    const other = eligibleDrills(team).find((d) => d.id !== 'funnel-grounders' && !d.athletic).id
    window.location.hash = `#/drill/${other}`
    await user.click(await screen.findByRole('button', { name: "Don't suggest this" }))
    await waitFor(async () => expect((await db.teams.get(t.id)).hidden).toEqual([other]))
    expect(await screen.findByText(/Plans won't pick this one/)).toBeTruthy()

    window.location.hash = '#/drills'
    const show = await screen.findByRole('combobox', { name: 'Show' })
    await user.selectOptions(show, 'favorites')
    await waitFor(() => expect(document.querySelectorAll('.drill-row')).toHaveLength(1))
    await user.selectOptions(show, 'hidden')
    await waitFor(() => expect(document.querySelectorAll('.drill-row')).toHaveLength(1))
    await user.click(screen.getByRole('button', { name: /Suggest .* again/ }))
    await waitFor(async () => expect((await db.teams.get(t.id)).hidden).toEqual([]))
  })

  it('adds, edits and deletes your own drill, and a plan that used it still reads', async () => {
    const user = userEvent.setup()
    const t = await saveTeam({ ...team })
    window.location.hash = '#/drills'
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Add your own drill' }))
    await user.type(await screen.findByLabelText('Name'), 'Two-ball relay')
    await user.selectOptions(screen.getByLabelText('Category'), 'game')
    await user.click(within(screen.getByRole('group', { name: 'What it works on' })).getAllByRole('button')[0])
    await user.click(screen.getByRole('button', { name: 'Whole team' }))
    await user.type(screen.getByLabelText('Steps, one per line'), 'Two lines.{enter}First done wins.')
    await user.click(screen.getByRole('button', { name: 'Save drill' }))
    await screen.findByText('Yours')
    const [saved] = await db.customDrills.toArray()
    expect(saved).toMatchObject({ name: 'Two-ball relay', category: 'game', group: 'team', steps: ['Two lines.', 'First done wins.'] })

    // In a saved plan.
    await db.plans.put({ id: 'p1', teamId: t.id, date: '2026-11-20', createdAt: '2026-11-11T10:00:00Z', minutes: 60, focus: [], blocks: [{ id: 'a', kind: 'drill', drillId: saved.id, minutes: 8 }, { id: 'h', kind: 'huddle', minutes: 4 }] })

    // Edit.
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const name = await screen.findByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'Three-ball relay')
    await user.click(screen.getByRole('button', { name: 'Save drill' }))
    await screen.findByRole('heading', { name: 'Three-ball relay' })

    // Delete.
    window.confirm = () => true
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(async () => expect((await db.customDrills.get(saved.id)).deleted).toBe(true))
    window.location.hash = '#/plan/p1'
    expect(await screen.findByText('Three-ball relay (deleted drill)')).toBeTruthy()
  })

  it('locks a block from its edit bar, and the rebuild button says Rebuild the rest', async () => {
    const user = userEvent.setup()
    const t = await saveTeam({ ...team })
    const plan = buildPlan(t, { minutes: 60, adults: 2, kids: 10, seed: 5, date: '2026-11-20' })
    await db.plans.put(plan)
    window.location.hash = `#/plan/${plan.id}`
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Build a new one' })).toBeTruthy()
    const items = within(screen.getByRole('list', { name: 'Practice blocks' })).getAllByRole('listitem')
    await user.click(within(items[1]).getAllByRole('button')[0])
    await user.click(within(items[1]).getByRole('button', { name: 'Lock' }))
    expect(await screen.findByRole('button', { name: 'Rebuild the rest' })).toBeTruthy()
    expect(within(items[1]).getByText('Locked')).toBeTruthy()
    expect(within(items[1]).getByRole('button', { name: '☆ Favorite' })).toBeTruthy()
    expect(within(items[1]).getByRole('button', { name: "Don't suggest this" })).toBeTruthy()
    window.confirm = () => true
    const lockedBlock = (await db.plans.get(plan.id)).blocks[1]
    await user.click(screen.getByRole('button', { name: 'Rebuild the rest' }))
    await waitFor(async () => expect((await db.plans.get(plan.id)).seed).not.toBe(plan.seed))
    expect((await db.plans.get(plan.id)).blocks[1]).toEqual(lockedBlock)
  })

  it('saves a plan as a template and starts a new plan from it on Today', async () => {
    const user = userEvent.setup()
    const t = await saveTeam({ ...team })
    const plan = buildPlan(t, { minutes: 60, adults: 2, kids: 10, seed: 5, date: '2026-11-01' })
    await db.plans.put(plan)
    window.location.hash = `#/plan/${plan.id}`
    render(<App />)
    await screen.findByRole('list', { name: 'Practice blocks' })
    window.prompt = () => 'Tuesday basics'
    await user.click(screen.getByRole('button', { name: 'Save as a template' }))
    await waitFor(async () => expect(await db.templates.count()).toBe(1))
    window.location.hash = '#/today'
    const pick = await screen.findByLabelText('Start from a template')
    await user.selectOptions(pick, (await db.templates.toArray())[0].id)
    await user.click(screen.getByRole('button', { name: 'Build practice plan' }))
    await waitFor(async () => expect(await db.plans.count()).toBe(2))
    const made = (await db.plans.toArray()).find((p) => p.id !== plan.id)
    expect(made.templateName).toBe('Tuesday basics')
    expect(drillIdsInPlan(made)).toEqual(drillIdsInPlan(plan))
    expect(made.blocks.map(blockMinutes)).toEqual(plan.blocks.map(blockMinutes))
  })

  it('a new team sees no template choice on Today', async () => {
    await saveTeam({ ...team })
    render(<App />)
    await screen.findByRole('button', { name: 'Build practice plan' })
    expect(screen.queryByLabelText('Start from a template')).toBe(null)
  })
})
