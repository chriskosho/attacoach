// Baseball or softball: the team setting, drill filtering, softball wording and older data.
import { describe, test, it, expect, beforeEach } from 'vitest'
import { render, screen, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DRILLS, drillById } from './data/drills.js'
import { SPORT } from './data/drillTags.js'
import { SCENARIOS } from './data/scenarios.js'
import { defaultRules, RULES } from './data/constants.js'
import { teamFromScenario } from './lib/scenarioTeam.js'
import { buildPlan, drillIdsInPlan, eligibleDrills, alternatives } from './lib/plan.js'
import { drillFor, sportOf, formatOf, formatsFor, ruleText, sportText, sportCopy, sportFits } from './lib/sport.js'
import { videoQuery } from './data/video.js'
import { planText } from './lib/share.js'
import { filterDrills } from './components/Drills.jsx'
import { MOMENTS } from './data/coaching.js'
import { db, clearEverything, importBackup, saveTeam } from './lib/db.js'
import { todayOptions } from './test/planSim.js'
import App from './App.jsx'

const softballScenarios = SCENARIOS.filter((s) => s.sport === 'softball')
const TEXT = ['name', 'setup', 'easier', 'harder']
const LISTS = ['equipment', 'steps', 'points']
const allText = (d) => [...TEXT.map((k) => d[k] ?? ''), ...LISTS.flatMap((k) => d[k] ?? [])].join(' \n ')

describe('softball test teams', () => {
  test('there is a fastpitch, a coach-pitch and a tee-ball team', () => {
    expect(softballScenarios.map((s) => s.format).sort()).toEqual(['coach-pitch', 'fastpitch', 'tee-ball'])
  })

  test.each(softballScenarios.flatMap((sc) => sc.practices.map((p, i) => [`${sc.id}, ${p.name}`, sc, i])))(
    '%s: 40 plans contain no baseball-only drill',
    (_, sc, i) => {
      const { team, players } = teamFromScenario(sc, 'x')
      for (let seed = 1; seed <= 40; seed++) {
        const plan = buildPlan(team, { ...todayOptions(team, players, team.practices[i]), seed })
        for (const id of drillIdsInPlan(plan)) expect(drillById(id).sport, id).not.toBe('baseball')
        expect(plan.blocks.length).toBeGreaterThan(3)
      }
    },
  )

  test('players pitch in fastpitch only', () => {
    const rules = Object.fromEntries(softballScenarios.map((sc) => [sc.format, teamFromScenario(sc).team.rules.kidPitch]))
    expect(rules).toEqual({ fastpitch: true, 'coach-pitch': false, 'tee-ball': false })
  })
})

describe('softball wording', () => {
  test('no drill a softball team can see says "mound" or "baseball"', () => {
    for (const d of DRILLS.filter((x) => sportFits(x, { sport: 'softball' }))) {
      const text = allText(drillFor(d, 'softball')).toLowerCase()
      expect(text, d.id).not.toMatch(/mound|baseball/)
    }
  })

  test('baseball teams read every drill exactly as written', () => {
    for (const d of DRILLS) {
      expect(drillFor(d, 'baseball')).toBe(d)
      expect(drillFor(d, { division: '10U' })).toBe(d)
    }
  })

  test('overrides only change what they name', () => {
    const d = drillById('bullpen-targets')
    const s = drillFor(d, 'softball')
    expect(s.setup).toMatch(/circle/)
    expect(s.steps).toEqual(d.steps)
    expect(s.points).toEqual(d.points)
  })

  test('shared text shown to a softball team uses its words', () => {
    const team = { name: 'Firebirds', division: '8U', sport: 'softball', format: 'coach-pitch' }
    const plan = { id: 'p', focus: [], blocks: [{ id: 'a', kind: 'drill', drillId: 'coach-says', minutes: 5 }, { id: 'b', kind: 'huddle', minutes: 4 }] }
    expect(planText(plan, team)).toContain('Coach says')
    const visit = sportCopy(MOMENTS, 'softball').find((m) => m.id === 'walks').why
    expect(visit).toContain('Visit the circle')
    expect(sportText('Baseball and softball are games of failure.', 'softball')).toBe('Baseball and softball are games of failure.')
    expect(sportText('Baseball IQ', 'baseball')).toBe('Baseball IQ')
  })

  test('the leading-off rule reads as leaving on the pitch for softball', () => {
    const leadoff = RULES.find((r) => r.id === 'leadoff')
    expect(ruleText(leadoff, 'softball').label).toBe('Leaving on the pitch')
    expect(ruleText(leadoff, 'softball').help).toMatch(/releases the ball/)
    expect(ruleText(leadoff, 'baseball')).toEqual({ label: leadoff.label, help: leadoff.help })
  })

  test('video searches say softball for softball teams', () => {
    expect(videoQuery('tee-work', 'softball')).toBe('tee hitting drills youth softball coach')
    expect(videoQuery('rounding-first', 'softball')).toBe('rounding first base softball')
    expect(videoQuery('tee-work', 'baseball')).toBe('tee hitting drills youth baseball coach')
    expect(videoQuery('alligator', 'softball')).toBe(null)
  })
})

describe('the sport tag', () => {
  test('every tagged drill exists and is baseball-only for a stated reason', () => {
    for (const id of Object.keys(SPORT)) {
      expect(drillById(id), id).toBeTruthy()
      expect(SPORT[id]).toBe('baseball')
    }
  })

  const softball = { id: 's', division: '12U', experience: 'experienced', sport: 'softball', format: 'fastpitch', rules: defaultRules('12U', 'softball', 'fastpitch') }
  const baseball = { ...softball, sport: 'baseball', format: null, rules: defaultRules('12U') }

  test('the planner, alternatives and the Drills tab leave baseball-only drills out for softball', () => {
    expect(eligibleDrills(softball).some((d) => d.sport === 'baseball')).toBe(false)
    expect(eligibleDrills(baseball).some((d) => d.id === 'pickoff-move')).toBe(true)
    const plan = { blocks: [{ id: 'a', kind: 'drill', drillId: 'net-targets', minutes: 10 }], spaces: ['field'], focus: ['pitching'] }
    expect(alternatives(softball, 'net-targets', plan, { showAllLevels: true }).some((d) => d.sport === 'baseball')).toBe(false)
    expect(filterDrills(DRILLS, { team: softball }).some((d) => d.sport === 'baseball')).toBe(false)
    // With the team filter off, every drill can still be looked up.
    expect(filterDrills(DRILLS, { team: softball, fitsTeam: false })).toHaveLength(DRILLS.length)
  })

  test('a team without a sport is a baseball team and plans exactly as before', () => {
    const old = { ...baseball }
    delete old.sport
    expect(sportOf(old)).toBe('baseball')
    const opts = { minutes: 90, adults: 2, kids: 12, seed: 5, date: '2026-04-01' }
    const strip = (p) => p.blocks.map((b) => b.drillId ?? b.stations?.join() ?? b.kind)
    expect(strip(buildPlan(old, opts))).toEqual(strip(buildPlan(baseball, opts)))
  })

  test('tee ball is offered for 6U only, and a format stays valid for the age', () => {
    expect(formatsFor('6U').map((f) => f.id)).toContain('tee-ball')
    for (const d of ['4U', '8U', '10U', '12U', '14U']) expect(formatsFor(d).map((f) => f.id)).not.toContain('tee-ball')
    expect(formatOf({ sport: 'softball', division: '8U', format: 'tee-ball' })).toBe('coach-pitch')
    expect(formatOf({ sport: 'baseball', division: '8U', format: 'fastpitch' })).toBe(null)
  })
})

describe('saving and restoring', () => {
  beforeEach(async () => {
    cleanup()
    await clearEverything()
    window.location.hash = ''
  })

  it('restores an older backup with every team as baseball', async () => {
    const t = { id: 'old-1', name: 'Hawks', division: '10U', experience: 'some', needs: [], rules: defaultRules('10U') }
    await importBackup({ format: 'attacoach-backup', version: 3, teams: [t], plans: [] })
    expect((await db.teams.get('old-1')).sport).toBe('baseball')
  })

  it('asks for the sport first and saves a softball team with its format', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Set up your team')
    const press = (name) => screen.getByRole('button', { name })
    await user.type(screen.getByLabelText("What's your name?"), 'Taylor')
    await user.type(screen.getByLabelText('Team name'), 'Sunflowers')
    await user.click(press('Softball'))
    await user.click(press('6U'))
    const formats = screen.getByRole('group', { name: 'Softball format' })
    expect(within(formats).getAllByRole('button').map((b) => b.textContent)).toEqual(['Fastpitch', 'Coach pitch', 'Tee ball'])
    expect(within(formats).getByRole('button', { name: 'Tee ball' }).getAttribute('aria-pressed')).toBe('true')
    await user.click(press('Next'))
    await user.click(screen.getByRole('button', { name: /New to coaching/ }))
    await user.click(press('Next'))
    await user.click(press('Skip for now'))
    await user.click(press('Skip for now'))
    expect(screen.queryByText('Leading off')).toBe(null)
    expect(screen.getByText('Leaving on the pitch')).toBeTruthy()
    await user.click(press('Next'))
    await user.click(press('Save and start planning'))
    await screen.findByText(/of \d+ min/)
    const [team] = await db.teams.toArray()
    expect(team).toMatchObject({ sport: 'softball', format: 'tee-ball', division: '6U' })
    expect(team.rules.kidPitch).toBe(false)
  })

  it('shows the sport on the Team page', async () => {
    await saveTeam({ name: 'Lady Hawks', division: '12U', sport: 'softball', format: 'fastpitch', experience: 'some', needs: [], rules: defaultRules('12U', 'softball', 'fastpitch') })
    window.location.hash = '#/team'
    render(<App />)
    expect(await screen.findByText('Softball, fastpitch')).toBeTruthy()
    expect(screen.getByText('Leaving on the pitch: on')).toBeTruthy()
  })
})
