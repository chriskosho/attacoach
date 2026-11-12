// The softball pack: fastpitch pitching, softball base running, the short game, softball defense, and
// drills for coach-pitch and tee-ball teams.
import { describe, test, expect } from 'vitest'
import { SOFTBALL_DRILLS } from './data/drillsSoftball.js'
import { TAGS, SPORT, FORMAT } from './data/drillTags.js'
import { DRILLS, drillById } from './data/drills.js'
import { SCENARIOS } from './data/scenarios.js'
import { DIVISIONS, defaultRules } from './data/constants.js'
import { SOFTBALL_VIDEO, VIDEO_QUERY, videoQuery } from './data/video.js'
import { eligibleDrills, drillIdsInPlan } from './lib/plan.js'
import { drillFor, writtenFor } from './lib/sport.js'
import { teamFromScenario } from './lib/scenarioTeam.js'
import { runSeason } from './test/planSim.js'

const team = (format, division = '12U', extra = {}) => ({
  id: 't',
  division,
  experience: 'experienced',
  sport: 'softball',
  format,
  rules: defaultRules(division, 'softball', format),
  ...extra,
})
const ids = (list) => new Set(list.map((d) => d.id))
const textOf = (d) => [d.name, d.setup, d.easier, d.harder, ...d.equipment, ...d.steps, ...d.points].join(' ')

describe('softball pack', () => {
  test('every new drill is tagged for space, staffing and softball', () => {
    for (const d of SOFTBALL_DRILLS) {
      expect(TAGS[d.id], d.id).toBeTruthy()
      expect(SPORT[d.id], d.id).toBe('softball')
      expect(drillById(d.id).sport).toBe('softball')
    }
  })

  test('a windmill progression of about 8 drills, for fastpitch teams where players pitch', () => {
    const fp = SOFTBALL_DRILLS.filter((d) => d.category === 'pitching' && d.id !== 'fp-pitcher-fields')
    expect(fp.length).toBeGreaterThanOrEqual(8)
    for (const d of fp) {
      expect(FORMAT[d.id]).toEqual(['fastpitch'])
      expect(d.requires).toContain('kidPitch')
      expect(textOf(d), d.id).toMatch(/Count every pitch/)
    }
    expect(fp.some((d) => d.level === 'beginner')).toBe(true)
    expect(fp.some((d) => d.level === 'intermediate')).toBe(true)
    expect(textOf(drillById('fp-coach-eye'))).toMatch(/pitching instructor/)
  })

  test('about 3 drills each for base running, the short game and defense', () => {
    const cat = (c) => SOFTBALL_DRILLS.filter((d) => d.id.startsWith('sb-') && d.category === c).length
    expect(cat('baserunning')).toBe(3)
    expect(cat('hitting')).toBe(3)
    expect(cat('infield') + 1).toBeGreaterThanOrEqual(3) // plus the pitcher fielding drill
    expect(drillById('sb-leave-on-release').requires).toEqual(['leadoff'])
  })

  test('coach-pitch and tee-ball teams get their drills and no windmill pitching', () => {
    for (const division of ['6U', '8U', '10U']) {
      const cp = eligibleDrills(team('coach-pitch', division))
      expect(cp.some((d) => d.id.startsWith('fp-')), division).toBe(false)
      expect(cp.some((d) => d.id.startsWith('tb-')), division).toBe(false)
      expect(cp.some((d) => d.category === 'pitching'), division).toBe(false)
      expect(cp.filter((d) => d.id.startsWith('cp-')).length, division).toBe(4)
    }
    const tb = eligibleDrills(team('tee-ball', '6U'))
    expect(tb.filter((d) => d.id.startsWith('tb-')).length).toBe(3)
    expect(tb.some((d) => d.id.startsWith('cp-') || d.id.startsWith('fp-') || d.category === 'pitching')).toBe(false)
    const fp = eligibleDrills(team('fastpitch', '12U'))
    expect(fp.some((d) => d.id.startsWith('cp-') || d.id.startsWith('tb-'))).toBe(false)
    expect(fp.filter((d) => d.id.startsWith('fp-')).length).toBe(9)
  })

  test('baseball teams see no softball drill at any age', () => {
    for (const division of DIVISIONS) {
      const b = eligibleDrills({ id: 'b', division, experience: 'experienced', sport: 'baseball', rules: defaultRules(division) }, { includeHidden: true })
      expect(b.some((d) => d.sport === 'softball'), division).toBe(false)
    }
  })

  test('the drill page says who a drill is written for', () => {
    expect(writtenFor(drillById('fp-k-drill'))).toBe('softball, fastpitch')
    expect(writtenFor(drillById('tb-at-bat'))).toBe('softball, tee ball')
    expect(writtenFor(drillById('towel-drill'))).toBe('baseball')
  })

  test.each(SCENARIOS.filter((s) => s.sport === 'softball').flatMap((sc) => sc.practices.map((p, i) => [`${sc.id}, ${p.name}`, sc, i])))(
    '%s: 10 practices in a row fit the format',
    (_, sc, i) => {
      const { team: t, players } = teamFromScenario(sc, 'x')
      const plans = runSeason({ team: t, players, practice: t.practices[i] }, 10)
      for (const plan of plans) {
        const drills = drillIdsInPlan(plan).map(drillById)
        for (const d of drills) {
          expect(d.sport, d.id).not.toBe('baseball')
          if (d.formats) expect(d.formats, d.id).toContain(sc.format)
        }
        const pitching = drills.some((d) => d.category === 'pitching')
        if (sc.format === 'fastpitch') expect(pitching).toBe(true)
        else expect(pitching).toBe(false)
      }
    },
  )
})

describe('softball wording for shared drills', () => {
  test('the strike zone, the grip and the double first base read right for softball', () => {
    expect(drillFor(drillById('ball-or-strike'), 'softball').points.join(' ')).toMatch(/armpits/)
    expect(drillFor(drillById('ball-or-strike'), 'baseball').points.join(' ')).toMatch(/knees to the letters/)
    expect(drillFor(drillById('throwing-progression'), 'softball').points[0]).toMatch(/three fingers/)
    expect(drillFor(drillById('run-through-first'), 'softball').points.join(' ')).toMatch(/double first base/)
    expect(drillFor(drillById('first-base-footwork'), 'softball').points.join(' ')).toMatch(/white half/)
  })

  test('overrides keep the rest of the drill as written', () => {
    for (const id of ['ball-or-strike', 'throwing-progression', 'run-through-first', 'first-base-footwork']) {
      const d = drillById(id)
      const s = drillFor(d, 'softball')
      expect(s.steps, id).toEqual(d.steps)
      expect(s.setup, id).toBe(d.setup)
    }
  })
})

describe('softball video searches', () => {
  test('every phrase points at a real drill', () => {
    Object.keys(SOFTBALL_VIDEO).forEach((id) => expect(drillById(id), id).toBeTruthy())
  })

  test('softball teams get only tested phrases', () => {
    for (const d of DRILLS) {
      const q = videoQuery(d.id, 'softball')
      if (d.sport === 'baseball') expect(q).toBe(VIDEO_QUERY[d.id] ?? null)
      else expect(q, d.id).toBe(SOFTBALL_VIDEO[d.id] ?? null)
    }
    expect(videoQuery('sb-slap-intro', 'baseball')).toBe('softball slap hitting for beginners')
    expect(videoQuery('towel-drill', 'softball')).toBe('youth baseball towel drill pitching')
    expect(videoQuery('fp-k-drill', 'softball')).toBeNull()
  })
})
