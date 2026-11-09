import { describe, it, expect } from 'vitest'
import { DRILLS } from './drills.js'
import { DIVISIONS, NEEDS, CATEGORIES, LEVELS, RULES, divIndex } from './constants.js'

const needIds = NEEDS.map((n) => n.id)
const catIds = CATEGORIES.map((c) => c.id)
const levelIds = LEVELS.map((l) => l.id)
const ruleIds = RULES.map((r) => r.id)

describe('drill library', () => {
  it('has unique ids and enough drills', () => {
    const ids = DRILLS.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(DRILLS.length).toBeGreaterThanOrEqual(55)
  })

  it.each(DRILLS.map((d) => [d.id, d]))('%s is complete and valid', (_id, d) => {
    expect(d.name.length).toBeGreaterThan(2)
    expect(catIds).toContain(d.category)
    expect(levelIds).toContain(d.level)
    expect(DIVISIONS).toContain(d.ages[0])
    expect(DIVISIONS).toContain(d.ages[1])
    expect(divIndex(d.ages[0])).toBeLessThanOrEqual(divIndex(d.ages[1]))
    expect(['small', 'team']).toContain(d.group)
    expect(d.minutes).toBeGreaterThan(0)
    expect(d.needs.length).toBeGreaterThan(0)
    d.needs.forEach((n) => expect(needIds).toContain(n))
    ;(d.requires ?? []).forEach((r) => expect(ruleIds).toContain(r))
    expect(d.setup).toBeTruthy()
    expect(d.steps.length).toBeGreaterThanOrEqual(2)
    expect(d.points.length).toBeGreaterThanOrEqual(1)
    expect(d.easier).toBeTruthy()
    expect(d.harder).toBeTruthy()
  })

  it('covers every category, including warm-ups, for every division', () => {
    for (const div of DIVISIONS) {
      const fits = DRILLS.filter((d) => divIndex(div) >= divIndex(d.ages[0]) && divIndex(div) <= divIndex(d.ages[1]))
      expect(fits.some((d) => d.category === 'warmup'), `${div} warm-up`).toBe(true)
      expect(fits.some((d) => d.category === 'hitting'), `${div} hitting`).toBe(true)
      expect(fits.some((d) => d.category === 'game'), `${div} game`).toBe(true)
    }
  })

  it('gives a beginner drill for every need from 10U up', () => {
    for (const div of ['10U', '12U', '14U']) {
      for (const need of needIds) {
        const ok = DRILLS.some(
          (d) => d.level === 'beginner' && d.needs.includes(need) && divIndex(div) >= divIndex(d.ages[0]) && divIndex(div) <= divIndex(d.ages[1]),
        )
        expect(ok, `${div} ${need}`).toBe(true)
      }
    }
  })
})
