import { buildPlan, localDate } from './plan.js'
import { lengthsFor, athleticDefault } from '../data/constants.js'
import { savePlan, db } from './db.js'

/**
 * Options for the plan a coach lands on right after setup, taken from what they just entered: the
 * first saved practice (length and space), the team's equipment and the roster size. Anything
 * setup left out falls back to the same defaults the Today screen uses.
 */
export function firstPlanOptions(team, players = []) {
  const lengths = lengthsFor(team.division)
  const practice = team.practices?.[0]
  const fallback = lengths.includes(60) ? 60 : lengths[lengths.length - 1]
  const minutes = practice?.minutes && lengths.includes(practice.minutes) ? practice.minutes : fallback
  return {
    minutes,
    adults: 2,
    kids: players.length || 12,
    spaces: practice?.spaces?.length ? practice.spaces : ['field'],
    equipment: team.equipment ?? null,
    athletic: team.athletic ?? athleticDefault(team.division),
    focus: team.needs?.length ? team.needs : undefined,
    practiceName: practice && team.practices.length > 1 ? practice.name : null,
  }
}

// The plan a coach lands on right after setup, so they see something useful straight away.
export async function createFirstPlan(team) {
  const players = team.id ? await db.players.where('teamId').equals(team.id).toArray() : []
  const plan = buildPlan(team, { ...firstPlanOptions(team, players), date: localDate(), seed: Date.now() })
  await savePlan(plan)
  return plan
}
