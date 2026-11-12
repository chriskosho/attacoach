import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { db, saveTeam, clearEverything, savePlayers } from './lib/db.js'
import { defaultRules } from './data/constants.js'
import { DRILLS, drillById } from './data/drills.js'
import {
  buildPlan, rebuildPlan, drillIdsInPlan, staffingFor, stationTarget, groupSizes, assignStaff, missingGear, availableSpaces, spaceFits,
} from './lib/plan.js'
import { nextPractice, practiceOn, staffingText, staffText } from './lib/practices.js'
import { planText } from './lib/share.js'
import { blankPlayer } from './lib/roster.js'

const team = (over = {}) => {
  const division = over.division ?? '10U'
  return { id: 't', name: 'Hawks', division, rules: defaultRules(division), experience: 'some', needs: ['grounders', 'contact', 'flyballs'], ...over }
}
const stationBlocks = (p) => p.blocks.filter((b) => b.kind === 'stations')

describe('drill tags', () => {
  it('every drill says where it works and who runs it, and no player-led drill has a bat', () => {
    for (const d of DRILLS) {
      expect(d.where.length).toBeGreaterThan(0)
      expect(['run', 'watch', 'kids']).toContain(d.staff)
      if (d.staff === 'kids') expect(d.bat).toBe(false)
      if (d.gear.length) expect(d.swap, d.id).toBeTruthy()
      expect(d.cap[0]).toBeLessThanOrEqual(d.cap[1])
    }
  })

  it('has drills for every kind of space', () => {
    for (const sp of ['field', 'cage', 'open', 'gym']) {
      expect(DRILLS.filter((d) => d.where.includes(sp) && d.category !== 'warmup').length).toBeGreaterThan(15)
    }
  })
})

describe('staffing', () => {
  it('always has the coach run a station, so every adult runs one', () => {
    for (const adults of [1, 2, 3, 5]) {
      expect(staffingFor({ adults })).toMatchObject({ coachRole: 'run', runSlots: adults, helpers: adults - 1 })
    }
    // An old saved role is ignored.
    expect(staffingFor({ adults: 3, role: 'float' }).coachRole).toBe('run')
  })

  it('sizes groups from the kids, about four each, never forcing a cap', () => {
    expect(stationTarget(4)).toBe(1)
    expect(stationTarget(8)).toBe(2)
    expect(stationTarget(12)).toBe(3)
    expect(stationTarget(14)).toBe(4)
    expect(groupSizes(14, 4)).toEqual([4, 4, 3, 3])
    expect(groupSizes(7, 2)).toEqual([4, 3])
  })

  it('says which stations need an adult, but never names who takes them', () => {
    const drills = ['funnel-grounders', 'dp-feeds', 'close-grounders'].map(drillById)
    const s = assignStaff(drills, staffingFor({ adults: 2 }), false)
    expect(s[1]).toMatchObject({ type: 'run', who: null, helper: null })
    expect(s[0]).toMatchObject({ type: 'run', who: null, helper: null })
    expect(s[2].type).toBe('kids')
    for (const seed of [1, 2, 3]) {
      const p = buildPlan(team(), { minutes: 90, adults: 4, kids: 12, seed })
      for (const b of stationBlocks(p)) for (const x of b.staff) expect([x.who, x.helper]).toEqual([null, null])
    }
  })

  it('never puts more run stations than adults, across many plans', () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const adults of [1, 2, 3, 4]) {
        const p = buildPlan(team(), { minutes: 90, adults, kids: 13, seed })
        for (const b of stationBlocks(p)) {
          const runs = b.staff.filter((s) => s.type === 'run').length
          expect(runs).toBeLessThanOrEqual(adults)
          expect(b.groups.reduce((a, c) => a + c, 0)).toBe(13)
        }
      }
    }
  })

  it('never runs two stations on one pitching machine at once', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const p = buildPlan(team(), { minutes: 90, adults: 4, kids: 16, spaces: ['cage', 'open'], equipment: ['machine', 'tee'], seed })
      for (const b of stationBlocks(p)) expect(b.stations.filter((id) => drillById(id).gear.includes('machine')).length).toBeLessThanOrEqual(1)
    }
  })

  it('describes the day in plain words', () => {
    expect(staffingText({ adults: 1, kids: 12, young: true })).toMatch(/stays together/)
    expect(staffingText({ adults: 1, kids: 12, young: false })).toMatch(/player-led/)
    expect(staffingText({ adults: 3, kids: 12, young: false })).toMatch(/Each adult runs one/)
    expect(staffingText({ adults: 3, kids: 12, young: false })).not.toMatch(/float|role/i)
    expect(staffText({ type: 'run' })).toBe('Needs an adult to run it.')
    // Plans saved before this version named people. They read neutrally now.
    expect(staffText({ type: 'run', who: 'coach' })).toBe('Needs an adult to run it.')
    expect(staffText({ type: 'watch', who: 'helper', helper: 2 })).toMatch(/^Watch-only/)
    expect(staffText({ type: 'watch', near: 0 }, ['Tee work'])).toMatch(/next to Tee work/)
  })
})

describe('space and gear', () => {
  it('a full field also counts as open grass', () => {
    expect(availableSpaces(['field']).has('open')).toBe(true)
    expect(spaceFits(drillById('partner-pop-ups'), availableSpaces(['cage']))).toBe(false)
  })

  it('cage-only days lean to hitting and use only drills that fit a cage', () => {
    let hitting = 0
    let total = 0
    for (let seed = 1; seed <= 20; seed++) {
      const p = buildPlan(team(), { minutes: 60, adults: 3, kids: 12, spaces: ['cage'], equipment: ['tee', 'machine'], seed })
      const avail = availableSpaces(['cage'])
      for (const id of drillIdsInPlan(p)) {
        const d = drillById(id)
        if (d.category === 'warmup') continue
        expect(spaceFits(d, avail), id).toBe(true)
        total++
        if (d.category === 'hitting') hitting++
      }
    }
    expect(hitting / total).toBeGreaterThan(0.4)
  })

  it('treats missing gear as a nudge, and assumes only basics when gear is unknown', () => {
    expect(missingGear(drillById('machine-hitting'), null)).toEqual(['machine'])
    expect(missingGear(drillById('tee-work'), null)).toEqual([])
    expect(missingGear(drillById('machine-hitting'), ['machine'])).toEqual([])
    // Every adult now runs a station, so a third adult adds a run station and the machine shows up
    // a little more. Two adults keep the original bar; with three, unknown gear must still make the
    // machine rarer than when the team says it has one.
    const machineCount = (adults, equipment) => {
      let n = 0
      for (let seed = 1; seed <= 20; seed++) {
        const opts = { minutes: 90, adults, spaces: ['cage', 'open'], seed, ...(equipment ? { equipment } : {}) }
        if (drillIdsInPlan(buildPlan(team(), opts)).includes('machine-hitting')) n++
      }
      return n
    }
    expect(machineCount(2)).toBeLessThan(4)
    expect(machineCount(3)).toBeLessThan(machineCount(3, ['tee', 'machine']))
  })

  it('balances the week: a field day after a cage day does less hitting, but never none', () => {
    // A hitting-first team, so the field day has hitting beyond the every-practice minimum.
    const hitters = team({ needs: ['contact', 'grounders', 'flyballs'] })
    let after = 0
    let before = 0
    for (let seed = 1; seed <= 20; seed++) {
      const cage = buildPlan(hitters, { minutes: 60, adults: 3, spaces: ['cage'], equipment: ['tee', 'machine'], seed })
      const count = (p) => drillIdsInPlan(p).filter((id) => drillById(id).category === 'hitting').length
      before += count(buildPlan(hitters, { minutes: 75, adults: 3, seed }))
      const next = buildPlan(hitters, { minutes: 75, adults: 3, recent: [cage], seed })
      expect(count(next)).toBeGreaterThan(0)
      after += count(next)
    }
    expect(after).toBeLessThan(before)
  })

  it('swaps in the athletic warm-up by age when it is on', () => {
    expect(drillIdsInPlan(buildPlan(team({ division: '6U' }), { minutes: 45, athletic: true, seed: 1 }))[0]).toBe('athletic-play')
    expect(drillIdsInPlan(buildPlan(team(), { minutes: 60, athletic: true, seed: 1 }))[0]).toBe('athletic-basic')
    expect(drillIdsInPlan(buildPlan(team({ division: '14U' }), { minutes: 60, athletic: true, seed: 1 }))[0]).toBe('athletic-advanced')
    const off = drillIdsInPlan(buildPlan(team(), { minutes: 60, athletic: false, seed: 1 }))
    expect(off.some((id) => drillById(id).athletic)).toBe(false)
  })

  it('rebuilds for fewer adults, keeping the same practice', () => {
    const p = buildPlan(team(), { minutes: 75, adults: 3, kids: 12, spaces: ['field'], seed: 4, practiceName: 'Tuesday' })
    const q = rebuildPlan(team(), p, { adults: 1 })
    expect(q).toMatchObject({ id: p.id, adults: 1, kids: 12, practiceName: 'Tuesday', minutes: 75 })
    for (const b of stationBlocks(q)) expect(b.staff.filter((s) => s.type === 'run').length).toBeLessThanOrEqual(1)
  })

  it('handles plans saved before this version', () => {
    const old = { id: 'p', minutes: 60, coaches: 2, focus: ['grounders'], date: '2026-11-01', seed: '3', blocks: [] }
    expect(rebuildPlan(team(), old).adults).toBe(2)
  })

  it('says what each station needs when sharing, without naming anyone', () => {
    const p = buildPlan(team(), { minutes: 90, adults: 2, kids: 12, seed: 3 })
    expect(planText(p, team())).toMatch(/needs an adult/)
    expect(planText(p, team())).not.toMatch(/head coach|helper \d/i)
  })
})

describe('weekly practices', () => {
  const practices = [
    { id: 'a', name: 'Field', day: 2, minutes: 90, spaces: ['field'] },
    { id: 'b', name: 'Cage', day: 4, minutes: 60, spaces: ['cage', 'open'] },
  ]
  it('picks the next practice and its date', () => {
    // 2026-11-09 is a Monday.
    expect(nextPractice(practices, '2026-11-09')).toEqual({ practice: practices[0], date: '2026-11-10' })
    expect(nextPractice(practices, '2026-11-11')).toEqual({ practice: practices[1], date: '2026-11-12' })
    expect(nextPractice(practices, '2026-11-13')).toEqual({ practice: practices[0], date: '2026-11-17' })
    expect(nextPractice([{ ...practices[0], day: null }], '2026-11-09').date).toBe('2026-11-09')
    expect(practiceOn(practices, '2026-11-12').id).toBe('b')
  })
})

describe('practice setup in the app', () => {
  beforeEach(async () => {
    await clearEverything()
    window.location.hash = ''
  })

  it('builds the next practice in the week with its space, length and helpers', async () => {
    const t = await saveTeam({
      ...team(),
      id: undefined,
      practices: [
        { id: 'a', name: 'Field day', day: null, minutes: 90, spaces: ['field'] },
        { id: 'b', name: 'Cage day', day: null, minutes: 60, spaces: ['cage', 'open'] },
      ],
      equipment: ['tee', 'machine'],
      athletic: true,
    })
    await savePlayers(t.id, Array.from({ length: 13 }, (_, i) => ({ ...blankPlayer(), first: `P${i}` })))
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Cage day' }))
    expect(screen.getByRole('button', { name: '60' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText(/60 min, \d adults?, 13 kids, Batting cage \+ Open grass, athletic warm-up/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'More: Adults at practice' }))
    expect(screen.getByText(/Each adult runs one/)).toBeTruthy()
    expect(screen.queryByText(/float|Your role/i)).toBe(null)
    await user.click(screen.getByRole('button', { name: 'Build practice plan' }))
    await screen.findByRole('list', { name: 'Practice blocks' })
    const [plan] = await db.plans.toArray()
    expect(plan).toMatchObject({ practiceName: 'Cage day', minutes: 60, adults: 3, kids: 13, spaces: ['cage', 'open'], athletic: true })
    expect(plan.equipment).toEqual(['tee', 'machine'])

    // A helper cancels: the adult count line on the plan opens Change of plans (Stage 11D moved the stepper there).
    await user.click(screen.getByRole('button', { name: /^3 adults ›/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Change of plans' })
    await user.click(within(sheet).getByRole('button', { name: 'Fewer: Adults today' }))
    await user.click(within(sheet).getByRole('button', { name: 'Apply changes' }))
    await waitFor(async () => expect((await db.plans.get(plan.id)).adults).toBe(2))
    expect(await screen.findByRole('button', { name: /^2 adults ›/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy()
  })

  it('edits how the team practices from the Team tab', async () => {
    const t = await saveTeam({ ...team(), id: undefined })
    const user = userEvent.setup()
    window.location.hash = '#/team'
    render(<App />)
    const card = (await screen.findByRole('heading', { name: 'How you practice' })).closest('section')
    expect(card.textContent).toMatch(/Field practice/)
    await user.click(within(card).getByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog')
    // One practice at a time: name and day, then length and where, then adults.
    await user.click(within(dialog).getByRole('button', { name: 'Add a practice' }))
    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    await user.click(within(dialog).getByRole('button', { name: 'Add practice' }))
    await user.click(within(dialog).getByRole('button', { name: 'Add another practice' }))
    await user.click(within(within(dialog).getByRole('group', { name: 'Day for Cage practice' })).getByRole('button', { name: 'Thu' }))
    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    await user.click(within(dialog).getByRole('button', { name: 'Add practice' }))
    await user.click(within(within(dialog).getByRole('group', { name: 'Equipment' })).getByRole('button', { name: 'Pitching machine' }))
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await db.teams.get(t.id)).practices).toHaveLength(2))
    const saved = await db.teams.get(t.id)
    expect(saved.practices[1]).toMatchObject({ name: 'Cage practice', day: 4, spaces: ['cage', 'open'] })
    expect(saved.equipment).toEqual(['machine'])
  })
})
