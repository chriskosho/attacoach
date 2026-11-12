// What the Today tab leads with, as plain rules so they can be tested without the screen.
import { localDate } from './plan.js'

// A plan's practice date. Plans made before dates existed fall back to the day they were made.
export const dateOfPlan = (plan) => plan.date ?? (plan.createdAt ? localDate(new Date(plan.createdAt)) : null)

// The practice recap linked to a plan, if the Log has one.
export const recapFor = (plan, debriefs) => (debriefs ?? []).find((d) => d.kind === 'practice' && d.planId === plan.id) ?? null

// A plan is finished once the timer reached Practice complete (finishedAt) or it has a linked recap.
// finishedAt is optional: plans and backups from before it existed are simply not finished.
export const isFinished = (plan, debriefs) => !!plan.finishedAt || !!recapFor(plan, debriefs)

/**
 * The plan to lead with: the soonest one dated today or later that is not finished yet. When two share
 * a day, the one made last.
 */
export function nextPlan(plans, today = localDate(), debriefs = []) {
  const upcoming = (plans ?? []).filter((p) => (dateOfPlan(p) ?? '') >= today && dateOfPlan(p) && !isFinished(p, debriefs))
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

/**
 * Today's finished practice, for the small "Today's practice: done" line: the plan dated today that was
 * finished most recently, with its recap when there is one. Null when nothing dated today is finished.
 */
export function finishedToday(plans, debriefs, today = localDate()) {
  const done = (plans ?? []).filter((p) => dateOfPlan(p) === today && isFinished(p, debriefs))
  if (!done.length) return null
  done.sort((a, b) => ((a.finishedAt ?? a.createdAt ?? '') < (b.finishedAt ?? b.createdAt ?? '') ? 1 : -1))
  return { plan: done[0], recap: recapFor(done[0], debriefs) }
}
