import { describe, it, expect } from 'vitest'
import { DRILLS } from './drills.js'
import { YOUNG_DRILLS } from './drillsYoung.js'
import { TAGS } from './drillTags.js'
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

describe('young teams and closing games', () => {
  const fits = (div) => DRILLS.filter((d) => divIndex(div) >= divIndex(d.ages[0]) && divIndex(div) <= divIndex(d.ages[1]))

  it('gives 4U at least 24 drills and 6U at least 40, covering what a T-ball practice needs', () => {
    expect(fits('4U').length).toBeGreaterThanOrEqual(24)
    expect(fits('6U').length).toBeGreaterThanOrEqual(40)
    for (const cat of ['warmup', 'throwing', 'infield', 'outfield', 'hitting', 'baserunning', 'game']) {
      expect(fits('4U').filter((d) => d.category === cat).length, `4U ${cat}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('has at least 12 closing games, and at least 3 for every age', () => {
    expect(DRILLS.filter((d) => d.category === 'game').length).toBeGreaterThanOrEqual(12)
    for (const div of DIVISIONS) expect(fits(div).filter((d) => d.category === 'game').length, div).toBeGreaterThanOrEqual(3)
  })

  it('keeps hit fly balls in 500 for ages that can track them; younger teams toss', () => {
    const d = DRILLS.find((x) => x.id === 'flyball-500')
    expect(divIndex(d.ages[0])).toBeGreaterThanOrEqual(divIndex('10U'))
    const toss = DRILLS.find((x) => x.id === 'toss-500')
    expect(toss.ages).toEqual(['6U', '8U'])
  })

  it('uses soft balls in every 4U drill with a ball in the air or on a bat', () => {
    for (const d of YOUNG_DRILLS.filter((x) => x.ages[0] === '4U' && !['warmup', 'baserunning'].includes(x.category))) {
      expect(d.equipment.join(' '), d.id).toMatch(/tennis|foam|wiffle|soft/i)
      expect(d.minutes, d.id).toBeLessThanOrEqual(8)
    }
  })

  it('no player is ever put out of Coach says, and nobody exercises as a penalty', () => {
    const d = DRILLS.find((x) => x.id === 'coach-says')
    expect(d.steps.join(' ')).not.toMatch(/jumping jacks|push-?ups|laps/i)
    for (const x of DRILLS) expect([...x.steps, ...x.points].join(' '), x.id).not.toMatch(/jumping jacks as|run a lap as|push-?ups for/i)
  })

  it('tags every new drill', () => {
    for (const d of YOUNG_DRILLS) expect(TAGS[d.id], d.id).toBeTruthy()
  })
})
