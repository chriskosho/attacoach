// Plan quality across a season: what a coach gets practice after practice, for every ready-made team.
// Each practice is built 40 times in a row (seeds 1 to 40, a week apart), the way the Today screen
// builds it, with the earlier plans passed back as `recent`.
import { describe, test, expect } from 'vitest'
import { scenarioPractices, runSeason, todayOptions, hasCategory, overlap, variedIds, closingGame } from './test/planSim.js'
import { buildPlan, rebuildPlan, drillIdsInPlan, eligibleDrills, availableSpaces, spaceFits, HIT_SHARE, recentPlans, totalMinutes } from './lib/plan.js'
import { drillById } from './data/drills.js'
import { divIndex } from './data/constants.js'
import { scenarioById } from './data/scenarios.js'
import { teamFromScenario } from './lib/scenarioTeam.js'
import { firstPlanOptions } from './lib/starter.js'

const RUNS = scenarioPractices().map((p) => ({ ...p, plans: runSeason(p, 40) }))
const label = (p) => `${p.sc.id}, ${p.practice.name}`
const hittingSpace = (spaces) => spaces.some((s) => ['field', 'cage', 'open'].includes(s))

// Minutes each player spends hitting: single hitting blocks plus each hitting station they rotate through.
function hittingMinutes(plan) {
  let m = 0
  for (const b of plan.blocks) {
    if (b.kind === 'drill' && drillById(b.drillId)?.category === 'hitting') m += b.minutes
    if (b.kind === 'stations') m += b.stations.filter((id) => drillById(id)?.category === 'hitting').length * b.stationMinutes
  }
  return m
}

describe('practice must-haves', () => {
  test.each(RUNS.filter((r) => hittingSpace(r.practice.spaces)).map((r) => [label(r), r]))('%s: every plan has hitting, about 15% of the time', (_, r) => {
    for (const plan of r.plans) {
      expect(hasCategory(plan, 'hitting')).toBe(true)
      expect(hittingMinutes(plan)).toBeGreaterThanOrEqual(Math.round(plan.minutes * HIT_SHARE) - 2)
    }
  })

  const pitchRuns = RUNS.filter((r) => r.team.rules.kidPitch && r.plans[0].minutes >= 75 && r.practice.spaces.some((s) => s === 'field' || s === 'cage'))
  test('the kid-pitch long practices are covered by this test', () => {
    expect(pitchRuns.length).toBeGreaterThanOrEqual(3)
  })
  test.each(pitchRuns.map((r) => [label(r), r]))('%s: every plan has pitching or catcher work', (_, r) => {
    for (const plan of r.plans) expect(hasCategory(plan, 'pitching', 'catcher')).toBe(true)
  })

  test('the plan still adds up to the practice length', () => {
    for (const r of RUNS) for (const plan of r.plans) expect(totalMinutes(plan)).toBe(plan.minutes)
  })
})

describe('variety from practice to practice', () => {
  test.each(RUNS.map((r) => [label(r), r]))('%s: consecutive plans share at most half their drills', (_, r) => {
    r.plans.slice(1).forEach((plan, i) => expect(overlap(r.plans[i], plan)).toBeLessThanOrEqual(0.5))
  })

  // Pools too small for the target today, held to what they reach until content batches add drills.
  // The no-steal 12U team: with stealing and leading off switched off only four base-running drills
  // and four closing games fit, and its 75 minutes leave four slots after warm-up, arm care and catch.
  const POOL_LIMITED = { 'no-steal-12u': 19 }
  const fieldRuns = RUNS.filter((r) => divIndex(r.team.division) >= divIndex('8U') && r.practice.spaces.includes('field'))
  test.each(fieldRuns.map((r) => [label(r), r]))('%s: any 10 plans in a row use at least 20 different drills', (_, r) => {
    const target = POOL_LIMITED[r.sc.id] ?? 20
    for (let i = 0; i + 10 <= r.plans.length; i++) {
      const seen = new Set(r.plans.slice(i, i + 10).flatMap((p) => [...variedIds(p)]))
      expect(seen.size).toBeGreaterThanOrEqual(target)
    }
  })

  test.each(RUNS.map((r) => [label(r), r]))('%s: the closing game changes when another game fits', (_, r) => {
    const avail = availableSpaces(r.practice.spaces)
    const games = eligibleDrills(r.team).filter((d) => d.category === 'game' && spaceFits(d, avail))
    r.plans.slice(1).forEach((plan, i) => {
      const before = closingGame(r.plans[i])
      if (before && games.length > 1) expect(closingGame(plan)).not.toBe(before)
    })
  })

  test('the same seed and inputs give the same plan', () => {
    const r = RUNS.find((x) => x.sc.id === 'rec-10u')
    const opts = { ...todayOptions(r.team, r.players, r.practice), date: '2026-04-06', recent: recentPlans(r.plans, '2026-04-06'), seed: 7 }
    const strip = (p) => p.blocks.map((b) => [b.kind, b.drillId ?? b.stations?.join(), b.minutes ?? b.stationMinutes])
    const a = buildPlan(r.team, opts)
    const b = buildPlan(r.team, opts)
    expect(strip(a)).toEqual(strip(b))
    expect([a.opener, a.closer]).toEqual([b.opener, b.closer])
  })

  test('the warm-up rotates', () => {
    for (const r of RUNS.filter((x) => !x.team.athletic)) {
      const warmups = new Set(r.plans.slice(0, 6).map((p) => p.blocks[0].drillId))
      expect(warmups.size).toBeGreaterThan(1)
    }
  })
})

describe('recent plans', () => {
  const plan = (date, createdAt = `${date}T10:00:00Z`) => ({ id: date + createdAt, date, createdAt, blocks: [] })
  test('takes the last four plans before the practice, within 30 days, newest first', () => {
    const plans = ['2026-03-01', '2026-03-20', '2026-03-25', '2026-03-27', '2026-03-30', '2026-04-02', '2026-04-05', '2026-04-08'].map((d) => plan(d))
    expect(recentPlans(plans, '2026-04-05').map((p) => p.date)).toEqual(['2026-04-02', '2026-03-30', '2026-03-27', '2026-03-25'])
    expect(recentPlans(plans, '2026-03-21').map((p) => p.date)).toEqual(['2026-03-20', '2026-03-01'])
    expect(recentPlans(plans, '2026-05-30')).toEqual([])
  })
})

describe('talks that fit the day', () => {
  test('the catch-at-home closer only follows a throwing or catching practice', () => {
    for (const r of RUNS) {
      for (const p of r.plans) {
        if (/catch at home/i.test(p.closer)) expect(p.focus.slice(0, 2).some((n) => n === 'throwing' || n === 'catching')).toBe(true)
      }
    }
  })
  test('a cage day opens on hitting', () => {
    const r = RUNS.find((x) => x.sc.id === 'travel-12u' && x.practice.name === 'Cage practice')
    for (const p of r.plans.slice(0, 5)) expect(p.opener.toLowerCase()).toMatch(/making contact|at-bat approach|bunting/)
  })
  test('closers vary across a season', () => {
    for (const r of RUNS) expect(new Set(r.plans.map((p) => p.closer)).size).toBeGreaterThan(2)
  })
})

describe('the first plan after setup', () => {
  test('uses the 4U team’s saved practice, equipment and roster', () => {
    const { team, players } = teamFromScenario(scenarioById('tball-4u'))
    const plan = buildPlan(team, { ...firstPlanOptions(team, players), seed: 1 })
    expect(plan.minutes).toBe(45)
    expect(plan.spaces).toEqual(['open'])
    expect(plan.kids).toBe(7)
    expect(plan.equipment).toEqual(['tee', 'cones', 'softBalls'])
    expect(totalMinutes(plan)).toBe(45)
  })
  test('falls back to today’s defaults when setup left things out', () => {
    const opts = firstPlanOptions({ division: '10U' }, [])
    expect(opts).toMatchObject({ minutes: 60, spaces: ['field'], kids: 12, adults: 2, equipment: null })
  })
  test('a cage-only team gets a cage plan', () => {
    const { team, players } = teamFromScenario(scenarioById('cage-only-10u'))
    const opts = firstPlanOptions(team, players)
    expect(opts).toMatchObject({ minutes: 60, spaces: ['cage'], kids: 8 })
  })
})

describe('rebuilding a plan', () => {
  test('keeps looking back on the same practices', () => {
    const r = RUNS.find((x) => x.sc.id === 'rookie-8u')
    const plan = r.plans[5]
    expect(plan.recent).toHaveLength(4)
    const again = rebuildPlan(r.team, plan)
    expect(drillIdsInPlan(again)).toEqual(drillIdsInPlan(plan))
    // A new build of the same practice still avoids last practice's drills.
    const fresh = rebuildPlan(r.team, plan, { seed: 999 })
    expect(overlap(r.plans[4], fresh)).toBeLessThanOrEqual(0.5)
  })
})
