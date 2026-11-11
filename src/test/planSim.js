// Builds runs of practice plans for the ready-made teams the way the Today screen does, so tests
// (and a quick report) can measure what coaches would actually get week after week.
import { SCENARIOS } from '../data/scenarios.js'
import { teamFromScenario } from '../lib/scenarioTeam.js'
import { buildPlan, drillIdsInPlan, recentPlans, isStaple, closingGameId } from '../lib/plan.js'
import { drillById } from '../data/drills.js'
import { lengthsFor } from '../data/constants.js'


const addDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// The options Today passes for a saved practice. Adults default to 2; kids are the roster size.
export function todayOptions(team, players, practice) {
  const lengths = lengthsFor(team.division)
  const minutes = lengths.includes(practice.minutes) ? practice.minutes : lengths.includes(60) ? 60 : lengths[lengths.length - 1]
  return {
    minutes,
    adults: 2,
    kids: players.length,
    coachRole: 'auto',
    spaces: practice.spaces?.length ? practice.spaces : ['field'],
    equipment: team.equipment ?? null,
    athletic: team.athletic,
    focus: team.needs,
    practiceName: practice.name,
  }
}

/** Every scenario practice as { sc, team, players, practice }. */
export function scenarioPractices() {
  return SCENARIOS.flatMap((sc) => {
    const { team, players } = teamFromScenario(sc, 'sim')
    team.id = `team-${sc.id}`
    return team.practices.map((practice) => ({ sc, team, players, practice }))
  })
}

/**
 * Builds `count` plans in a row for one practice, a week apart, seeds 1..count. Each plan is given
 * the earlier ones the way Today gives them.
 */
export function runSeason({ team, players, practice }, count = 40, start = '2026-03-02') {
  const plans = []
  for (let i = 0; i < count; i++) {
    const date = addDays(start, i * 7)
    const recent = recentPlans(plans, date)
    plans.push(buildPlan(team, { ...todayOptions(team, players, practice), date, recent, seed: i + 1 }))
  }
  return plans
}

export const drillsOf = (plan) => drillIdsInPlan(plan).map(drillById).filter(Boolean)
export const hasCategory = (plan, ...cats) => drillsOf(plan).some((d) => cats.includes(d.category))
// Drills that count toward variety: staples (throwing progression, arm care, the athletic routine) left out.
export const variedIds = (plan) => new Set(drillIdsInPlan(plan).filter((id) => !isStaple(drillById(id))))

// Share of this plan's drills that were also in the previous plan (staples left out).
export function overlap(prev, plan) {
  const a = variedIds(prev)
  const b = variedIds(plan)
  if (!b.size) return 0
  let shared = 0
  for (const id of b) if (a.has(id)) shared++
  return shared / b.size
}

export const closingGame = closingGameId

export function report() {
  return scenarioPractices().map((p) => {
    const plans = runSeason(p)
    const overlaps = plans.slice(1).map((pl, i) => overlap(plans[i], pl))
    const ten = new Set(plans.slice(0, 10).flatMap((pl) => [...variedIds(pl)]))
    const closers = plans.map(closingGame)
    const repeatsCloser = closers.slice(1).filter((c, i) => c && c === closers[i]).length
    return {
      team: p.sc.id,
      practice: p.practice.name,
      minutes: plans[0].minutes,
      hitting: plans.filter((pl) => hasCategory(pl, 'hitting')).length,
      pitchCatch: plans.filter((pl) => hasCategory(pl, 'pitching', 'catcher')).length,
      maxOverlap: Math.round(Math.max(...overlaps) * 100),
      avgOverlap: Math.round((overlaps.reduce((a, b) => a + b, 0) / overlaps.length) * 100),
      distinct10: ten.size,
      distinct40: new Set(plans.flatMap((pl) => [...variedIds(pl)])).size,
      closerRepeats: repeatsCloser,
      closers: new Set(closers.filter(Boolean)).size,
    }
  })
}
