// What the Today tab leads with, as plain rules so they can be tested without the screen.
import { localDate } from './plan.js'

// A plan's practice date. Plans made before dates existed fall back to the day they were made.
export const dateOfPlan = (plan) => plan.date ?? (plan.createdAt ? localDate(new Date(plan.createdAt)) : null)

/**
 * The plan to lead with: the soonest one dated today or later. When two share a day, the one made last.
 */
export function nextPlan(plans, today = localDate()) {
  const upcoming = (plans ?? []).filter((p) => (dateOfPlan(p) ?? '') >= today && dateOfPlan(p))
  upcoming.sort((a, b) => {
    const da = dateOfPlan(a)
    const db = dateOfPlan(b)
    if (da !== db) return da < db ? -1 : 1
    return (a.createdAt ?? '') < (b.createdAt ?? '') ? 1 : -1
  })
  return upcoming[0] ?? null
}

/**
 * The plan to ask "How did it go?" about: the most recent plan, when it is in the past and the Log
 * has no practice recap for it (a recap linked to the plan, or dated the same day).
 */
export function planNeedingRecap(plans, debriefs, today = localDate()) {
  const dated = (plans ?? []).filter(dateOfPlan)
  if (!dated.length) return null
  const latest = [...dated].sort((a, b) => {
    const da = dateOfPlan(a)
    const db = dateOfPlan(b)
    if (da !== db) return da < db ? 1 : -1
    return (a.createdAt ?? '') < (b.createdAt ?? '') ? 1 : -1
  })[0]
  if (dateOfPlan(latest) >= today) return null
  const done = (debriefs ?? []).some((d) => d.kind === 'practice' && (d.planId === latest.id || d.date === dateOfPlan(latest)))
  return done ? null : latest
}
