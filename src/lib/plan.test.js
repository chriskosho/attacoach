import { describe, it, expect } from 'vitest'
import {
  buildPlan, totalMinutes, drillIdsInPlan, alternatives, swapDrill, setBlockMinutes, moveBlock,
  removeBlock, addDrill, schedule, eligibleDrills, needScore, hasPitching,
} from './plan.js'
import { drillById } from '../data/drills.js'
import { OPENERS } from '../data/motivation.js'
import { DIVISIONS, PRACTICE_LENGTHS, defaultRules, divIndex, MAX_BLOCK } from '../data/constants.js'

const team = (over = {}) => {
  const division = over.division ?? '10U'
  return { id: 't1', name: 'Test', division, rules: defaultRules(division), experience: 'some', needs: ['grounders', 'contact'], ...over }
}

describe('defaultRules', () => {
  it('turns on dropped third, leading off and stealing from 10U', () => {
    expect(defaultRules('8U')).toEqual({ kidPitch: false, stealing: false, leadoff: false, droppedThird: false })
    expect(defaultRules('10U')).toEqual({ kidPitch: true, stealing: true, leadoff: true, droppedThird: true })
    expect(defaultRules('14U').leadoff).toBe(true)
  })
})

describe('buildPlan', () => {
  for (const division of DIVISIONS) {
    for (const minutes of PRACTICE_LENGTHS) {
      for (const coaches of [1, 2, 3]) {
        it(`${division}, ${minutes} min, ${coaches} coach(es) fills the time exactly`, () => {
          const t = team({ division, rules: defaultRules(division) })
          const plan = buildPlan(t, { minutes, coaches, seed: `${division}-${minutes}-${coaches}` })
          expect(totalMinutes(plan)).toBe(minutes)
          expect(plan.blocks[plan.blocks.length - 1].kind).toBe('huddle')
          const first = drillById(plan.blocks[0].drillId)
          expect(first.category).toBe('warmup')
          const ids = drillIdsInPlan(plan)
          expect(new Set(ids).size).toBe(ids.length)
          for (const id of ids) {
            const d = drillById(id)
            expect(divIndex(division)).toBeGreaterThanOrEqual(divIndex(d.ages[0]))
            expect(divIndex(division)).toBeLessThanOrEqual(divIndex(d.ages[1]))
          }
          for (const b of plan.blocks) {
            if (b.kind === 'stations') expect(b.stationMinutes).toBeGreaterThan(0)
            else expect(b.minutes).toBeGreaterThan(0)
          }
        })
      }
    }
  }

  it('is repeatable with the same seed', () => {
    const a = buildPlan(team(), { minutes: 90, coaches: 2, seed: 'x' })
    const b = buildPlan(team(), { minutes: 90, coaches: 2, seed: 'x' })
    expect(drillIdsInPlan(a)).toEqual(drillIdsInPlan(b))
    expect(a.opener).toBe(b.opener)
  })

  it('only gives beginner drills to a new coach', () => {
    for (let i = 0; i < 10; i++) {
      const plan = buildPlan(team({ experience: 'new', division: '12U', rules: defaultRules('12U') }), { minutes: 90, coaches: 3, seed: i })
      drillIdsInPlan(plan).forEach((id) => expect(drillById(id).level).toBe('beginner'))
    }
  })

  it('leaves out drills the team rules do not allow', () => {
    const rules = { kidPitch: true, stealing: false, leadoff: false, droppedThird: false }
    for (let i = 0; i < 15; i++) {
      const plan = buildPlan(team({ rules, experience: 'experienced', needs: ['baserunning', 'catcher', 'awareness'] }), { minutes: 120, coaches: 3, seed: i })
      drillIdsInPlan(plan).forEach((id) => (drillById(id).requires ?? []).forEach((r) => expect(rules[r], `${id} needs ${r}`).toBe(true)))
    }
  })

  it('aims the main work at the focus needs', () => {
    for (let i = 0; i < 10; i++) {
      const plan = buildPlan(team({ needs: ['flyballs'] }), { minutes: 75, coaches: 2, seed: i })
      const hits = drillIdsInPlan(plan).filter((id) => drillById(id).needs.includes('flyballs'))
      expect(hits.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('today\'s focus overrides the team needs', () => {
    const plan = buildPlan(team({ needs: ['grounders'] }), { minutes: 60, coaches: 1, focus: ['bunting'], seed: 1 })
    expect(plan.focus).toEqual(['bunting'])
    expect(drillIdsInPlan(plan).some((id) => drillById(id).needs.includes('bunting'))).toBe(true)
    expect(plan.opener).toContain('bunting')
  })

  it('the opener and closer come from the lists whichever seed picks them', () => {
    const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const asRegex = (o) => new RegExp('^' + o.split('{need}').map(esc).join('.+') + '$')
    const openers = [...OPENERS.young, ...OPENERS.older].map(asRegex)
    for (let seed = 1; seed <= 24; seed++) {
      const plan = buildPlan(team({ needs: ['grounders'] }), { minutes: 60, coaches: 1, focus: ['bunting'], seed })
      expect(openers.some((r) => r.test(plan.opener))).toBe(true)
      expect(plan.opener).toContain('bunting')
      expect(plan.closer.length).toBeGreaterThan(10)
    }
  })

  it('uses station rotations when there are several coaches', () => {
    const plan = buildPlan(team(), { minutes: 90, coaches: 3, seed: 2 })
    const st = plan.blocks.find((b) => b.kind === 'stations')
    expect(st).toBeTruthy()
    expect(st.stations.length).toBe(3)
    st.stations.forEach((id) => expect(drillById(id).group).toBe('small'))
  })

  it('keeps a young team together when there is one adult', () => {
    const t = team({ division: '6U', rules: defaultRules('6U') })
    const plan = buildPlan(t, { minutes: 60, adults: 1, kids: 12, seed: 2 })
    expect(plan.blocks.some((b) => b.kind === 'stations')).toBe(false)
  })

  it('with one adult at 8U and up, one station needs an adult and the rest are player-led', () => {
    for (let seed = 1; seed <= 15; seed++) {
      const plan = buildPlan(team(), { minutes: 90, adults: 1, kids: 12, seed })
      for (const b of plan.blocks.filter((x) => x.kind === 'stations')) {
        expect(b.staff.filter((s) => s.type === 'run')).toHaveLength(1)
        expect(b.staff.find((s) => s.type === 'run').who).toBe(null)
        expect(b.staff.filter((s) => s.type === 'watch')).toHaveLength(0)
        b.stations.forEach((id, i) => {
          if (b.staff[i].type === 'kids') expect(drillById(id).bat).toBe(false)
        })
      }
    }
  })

  it('adds a water break for each 40 minutes', () => {
    expect(buildPlan(team(), { minutes: 90, seed: 1 }).blocks.filter((b) => b.kind === 'break').length).toBe(2)
    expect(buildPlan(team(), { minutes: 45, seed: 1 }).blocks.filter((b) => b.kind === 'break').length).toBe(1)
  })

  it('includes catch play from 8U but not for 4U', () => {
    expect(drillIdsInPlan(buildPlan(team({ division: '8U', rules: defaultRules('8U') }), { minutes: 60, seed: 1 }))).toContain('throwing-progression')
    expect(drillIdsInPlan(buildPlan(team({ division: '4U', rules: defaultRules('4U') }), { minutes: 60, seed: 1 }))).not.toContain('throwing-progression')
  })

  it('works when the team has no needs', () => {
    const plan = buildPlan(team({ needs: [] }), { minutes: 60, seed: 3 })
    expect(totalMinutes(plan)).toBe(60)
  })
})

describe('fit and reminders', () => {
  it('does not cut drills to less than three quarters of their length', () => {
    for (let i = 0; i < 30; i++) {
      for (const division of ['8U', '10U', '12U']) {
        const plan = buildPlan(team({ division, rules: defaultRules(division) }), { minutes: 90, coaches: 1 + (i % 3), seed: i })
        plan.blocks.slice(0, -2).forEach((b) => {
          if (b.kind !== 'drill') return
          const d = drillById(b.drillId)
          if (d.category === 'game') return
          expect(b.minutes, d.id).toBeGreaterThanOrEqual(Math.floor(Math.min(d.minutes, MAX_BLOCK[division]) * 0.75))
        })
      }
    }
  })

  it('reminds about pitch counts only when players pitch', () => {
    const p = buildPlan(team(), { minutes: 60, seed: 1 })
    const pitching = { ...p, blocks: [{ id: 'x', kind: 'drill', drillId: 'bullpen-targets', minutes: 10 }] }
    const armOnly = { ...p, blocks: [{ id: 'x', kind: 'drill', drillId: 'arm-care', minutes: 6 }] }
    expect(hasPitching(pitching)).toBe(true)
    expect(hasPitching(armOnly)).toBe(false)
  })

  it('records the practice date', () => {
    expect(buildPlan(team(), { minutes: 60, seed: 1, date: '2030-01-02' }).date).toBe('2030-01-02')
    expect(buildPlan(team(), { minutes: 60, seed: 1 }).date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('editing', () => {
  const base = () => buildPlan(team(), { minutes: 60, coaches: 2, kids: 8, seed: 'edit' })

  it('offers alternatives not already in the plan', () => {
    const plan = base()
    const drill = plan.blocks.find((b) => b.kind === 'drill' && b.drillId)
    const alts = alternatives(team(), drill.drillId, plan)
    expect(alts.length).toBeGreaterThan(0)
    const inPlan = new Set(drillIdsInPlan(plan))
    alts.forEach((d) => expect(inPlan.has(d.id)).toBe(false))
  })

  it('swaps a drill and a station', () => {
    let plan = base()
    const b = plan.blocks.find((x) => x.kind === 'drill')
    plan = swapDrill(plan, b.id, 'pickle')
    expect(plan.blocks.find((x) => x.id === b.id).drillId).toBe('pickle')
    const st = plan.blocks.find((x) => x.kind === 'stations')
    plan = swapDrill(plan, st.id, 'tee-work', 1)
    expect(plan.blocks.find((x) => x.id === st.id).stations[1]).toBe('tee-work')
  })

  it('changes minutes, moves and removes blocks', () => {
    let plan = base()
    const [a, b] = plan.blocks
    plan = setBlockMinutes(plan, a.id, 20)
    expect(plan.blocks[0].minutes).toBe(20)
    plan = moveBlock(plan, a.id, 1)
    expect(plan.blocks[1].id).toBe(a.id)
    expect(moveBlock(plan, plan.blocks[0].id, -1)).toBe(plan)
    plan = removeBlock(plan, b.id)
    expect(plan.blocks.find((x) => x.id === b.id)).toBeUndefined()
  })

  it('turns a two-station block into a plain drill when one station is removed', () => {
    let plan = base()
    const st = plan.blocks.find((x) => x.kind === 'stations')
    plan = removeBlock(plan, st.id, 0)
    const after = plan.blocks.find((x) => x.id === st.id)
    expect(after.kind).toBe('drill')
    expect(after.minutes).toBe(st.stationMinutes)
  })

  it('adds a drill before the huddle', () => {
    const plan = addDrill(base(), 'pickle', '10U')
    expect(plan.blocks[plan.blocks.length - 2].drillId).toBe('pickle')
    expect(plan.blocks[plan.blocks.length - 1].kind).toBe('huddle')
  })

  it('schedules start and end times', () => {
    const plan = base()
    const s = schedule(plan)
    expect(s[0].start).toBe(0)
    expect(s[s.length - 1].end).toBe(totalMinutes(plan))
  })
})

describe('eligibility', () => {
  it('shows harder drills only when asked', () => {
    const t = team({ experience: 'new' })
    expect(eligibleDrills(t).every((d) => d.level === 'beginner')).toBe(true)
    expect(eligibleDrills(t, { showAllLevels: true }).some((d) => d.level !== 'beginner')).toBe(true)
  })

  it('weights the first need most', () => {
    const d = { needs: ['contact'] }
    expect(needScore(d, ['contact', 'grounders'])).toBeGreaterThan(needScore(d, ['grounders', 'contact']))
  })
})
