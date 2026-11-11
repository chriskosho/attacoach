// "Season so far": plain numbers from the saved plans and the log. Pure functions.
import { drillById } from '../data/drills.js'
import { NEEDS, needLabel } from '../data/constants.js'
import { drillIdsInPlan, localDate } from './plan.js'

// A need with no practice for this many days gets a nudge.
export const QUIET_DAYS = 21

export const planDay = (plan) => plan.date ?? (plan.createdAt ? localDate(new Date(plan.createdAt)) : null)

const dayNumber = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86400000)
}
export const daysBetween = (from, to) => dayNumber(to) - dayNumber(from)

// A practice counts once its day has come, or when the coach logged a recap for it.
export function practisedPlans(plans, debriefs, today) {
  const recapped = new Set(debriefs.filter((e) => e.kind === 'practice' && e.planId).map((e) => e.planId))
  return plans.filter((p) => {
    const day = planDay(p)
    return recapped.has(p.id) || (day && day <= today)
  })
}

export function needsInPlan(plan) {
  const out = new Set()
  for (const id of drillIdsInPlan(plan)) for (const n of drillById(id)?.needs ?? []) out.add(n)
  return out
}

export function seasonSummary({ team, plans, debriefs, today = localDate() }) {
  const done = practisedPlans(plans, debriefs, today)
  const games = debriefs.filter((e) => e.kind === 'game').length
  const count = {}
  const last = {}
  let first = null
  for (const p of done) {
    const day = planDay(p)
    if (day && (!first || day < first)) first = day
    for (const n of needsInPlan(p)) {
      count[n] = (count[n] ?? 0) + 1
      if (day && (!last[n] || day > last[n])) last[n] = day
    }
  }
  const listed = (team.needs ?? []).filter((id) => NEEDS.some((n) => n.id === id))
  const others = NEEDS.map((n) => n.id).filter((id) => !listed.includes(id) && count[id] > 0).sort((a, b) => count[b] - count[a])
  const areas = [...listed, ...others].map((id) => ({ id, label: needLabel(id), count: count[id] ?? 0, last: last[id] ?? null, onList: listed.includes(id) }))
  // One suggestion: the first need on the team's list that has been quiet for three weeks.
  let quiet = null
  for (const id of listed) {
    const l = last[id] ?? null
    const quietFor = l ? daysBetween(l, today) : first ? daysBetween(first, today) : -1
    if (quietFor >= QUIET_DAYS) {
      quiet = { id, label: needLabel(id), last: l, days: quietFor, never: !l }
      break
    }
  }
  return { practices: done.length, games, areas, quiet }
}
