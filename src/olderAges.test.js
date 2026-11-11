// Content batch C3: drills for 10U to 14U, and the accuracy pass over the library.
import { describe, test, expect } from 'vitest'
import { OLDER_DRILLS } from './data/drillsOlder.js'
import { TAGS, SPORT } from './data/drillTags.js'
import { DRILLS, drillById } from './data/drills.js'
import { SCENARIOS } from './data/scenarios.js'
import { DIVISIONS, defaultRules } from './data/constants.js'
import { HUDDLES, HUDDLE_VARIANTS, huddleLines } from './data/coaching.js'
import { eligibleDrills, drillIdsInPlan } from './lib/plan.js'
import { teamFromScenario } from './lib/scenarioTeam.js'
import { runSeason } from './test/planSim.js'

const textOf = (d) => [d.name, d.setup, d.easier, d.harder, ...d.equipment, ...d.steps, ...d.points].join(' ')
const idx = (age) => DIVISIONS.indexOf(age)

describe('older ages', () => {
  test('at least 15 advanced drills and 10 pitching drills for baseball', () => {
    expect(DRILLS.filter((d) => d.level === 'advanced').length).toBeGreaterThanOrEqual(15)
    expect(DRILLS.filter((d) => d.category === 'pitching' && d.sport !== 'softball').length).toBeGreaterThanOrEqual(10)
  })

  test('the new drills are for 10U to 14U, mostly intermediate and advanced, and every one is tagged', () => {
    expect(OLDER_DRILLS.length).toBeGreaterThanOrEqual(12)
    for (const d of OLDER_DRILLS) {
      expect(idx(d.ages[0]), d.id).toBeGreaterThanOrEqual(idx('10U'))
      expect(d.level, d.id).not.toBe('beginner')
      expect(TAGS[d.id], d.id).toBeTruthy()
    }
    expect(OLDER_DRILLS.filter((d) => d.level === 'advanced').length).toBeGreaterThanOrEqual(8)
  })

  test('pitching drills that throw pitches tell the coach to count them', () => {
    for (const d of OLDER_DRILLS.filter((d) => d.requires?.includes('kidPitch') || d.id === 'time-to-plate')) {
      expect(textOf(d), d.id).toMatch(/Count every pitch/)
    }
  })

  test('drills that need a rule carry it, and a no-steal league never sees them', () => {
    expect(drillById('secondary-lead').requires).toContain('leadoff')
    expect(drillById('time-to-plate').requires).toContain('leadoff')
    expect(drillById('dirt-read-third').requires).toEqual(['leadoff', 'stealing'])
    expect(drillById('catcher-throws-bases').requires).toContain('stealing')
    expect(drillById('pitcher-covers-home').requires).toContain('stealing')
    const sc = SCENARIOS.find((s) => s.id === 'no-steal-12u')
    const { team } = teamFromScenario(sc, 'x')
    const ids = eligibleDrills(team).map((d) => d.id)
    for (const id of ['secondary-lead', 'time-to-plate', 'dirt-read-third', 'catcher-throws-bases', 'pitcher-covers-home', 'leadoff-basics']) {
      if (!team.rules.leadoff || !team.rules.stealing) expect(ids, id).not.toContain(id)
    }
  })

  test('overhand pitching and leads stay baseball-only', () => {
    for (const id of ['bullpen-intent', 'bullpen-plan', 'pfp-comebackers', 'pitcher-covers-home', 'time-to-plate', 'secondary-lead', 'dirt-read-third']) {
      expect(SPORT[id], id).toBe('baseball')
    }
    const softball = eligibleDrills({ id: 's', division: '12U', experience: 'experienced', sport: 'softball', format: 'fastpitch', rules: defaultRules('12U', 'softball', 'fastpitch') })
    expect(softball.some((d) => d.sport === 'baseball')).toBe(false)
  })

  test('10 practices for the 12U travel team on a field for 120 minutes have real work in every one', () => {
    const sc = SCENARIOS.find((s) => s.id === 'travel-12u')
    const { team, players } = teamFromScenario(sc, 'x')
    const practice = team.practices.find((p) => p.minutes === 120)
    const plans = runSeason({ team, players, practice }, 10)
    const seen = new Set()
    for (const plan of plans) {
      const drills = drillIdsInPlan(plan).map(drillById)
      drills.forEach((d) => seen.add(d.id))
      const real = drills.filter((d) => d.category !== 'warmup' && d.level !== 'beginner')
      expect(real.length).toBeGreaterThanOrEqual(4)
      for (const d of drills) expect(idx(d.ages[1]), d.id).toBeGreaterThanOrEqual(idx('12U'))
    }
    expect(plans.filter((p) => drillIdsInPlan(p).some((id) => drillById(id).level === 'advanced')).length).toBeGreaterThanOrEqual(8)
    expect(seen.size).toBeGreaterThanOrEqual(45)
  })
})

describe('accuracy pass', () => {
  test('the lines a reviewer flagged are fixed', () => {
    expect(textOf(drillById('tee-work'))).not.toMatch(/swing level/i)
    expect(textOf(drillById('first-base-footwork'))).not.toMatch(/both heels on the front edge/)
    expect(textOf(drillById('front-toss'))).not.toMatch(/right field/)
    expect(textOf(drillById('catcher-stance'))).not.toMatch(/glove-side leg/)
    expect(drillById('hot-potato').ages).toEqual(['6U', '10U'])
  })

  test('only tee work claims every age from 4U to 14U (hitters use a tee at every level)', () => {
    expect(DRILLS.filter((d) => d.ages[0] === '4U' && d.ages[1] === '14U').map((d) => d.id)).toEqual(['tee-work'])
  })
})

describe('practice huddles', () => {
  const dates = Array.from({ length: 10 }, (_, i) => `2026-04-${String(i + 1).padStart(2, '0')}`)

  test('every variant slot lines up with a huddle point', () => {
    for (const [kind, bands] of Object.entries(HUDDLE_VARIANTS)) {
      for (const band of ['young', 'older']) {
        expect(bands[band].length).toBe(HUDDLES[kind][band].length)
        bands[band].flat().forEach((line) => expect(line.length).toBeLessThan(120))
      }
    }
  })

  test('the same practice always reads the same; different practices read differently', () => {
    for (const kind of ['practiceOpen', 'practiceClose']) {
      for (const band of ['young', 'older']) {
        expect(huddleLines(HUDDLES, HUDDLE_VARIANTS, kind, band, '2026-04-01')).toEqual(huddleLines(HUDDLES, HUDDLE_VARIANTS, kind, band, '2026-04-01'))
        const versions = new Set(dates.map((d) => huddleLines(HUDDLES, HUDDLE_VARIANTS, kind, band, d).join('|')))
        expect(versions.size, `${kind} ${band}`).toBeGreaterThanOrEqual(3)
      }
    }
    expect(huddleLines(HUDDLES, HUDDLE_VARIANTS, 'practiceOpen', 'older')).toEqual(HUDDLES.practiceOpen.older)
    expect(huddleLines(HUDDLES, HUDDLE_VARIANTS, 'preGame', 'older', '2026-04-01')).toEqual(HUDDLES.preGame.older)
  })

  test('the opener no longer claims the focus showed up in the last game', () => {
    expect(HUDDLES.practiceOpen.older.join(' ')).not.toMatch(/last game/)
  })
})
