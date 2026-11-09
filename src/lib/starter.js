import { buildPlan, localDate } from './plan.js'
import { lengthsFor } from '../data/constants.js'
import { savePlan } from './db.js'

// The plan a coach lands on right after setup, so they see something useful straight away.
export async function createFirstPlan(team) {
  const lengths = lengthsFor(team.division)
  const minutes = lengths.includes(60) ? 60 : lengths[lengths.length - 1]
  const plan = buildPlan(team, { minutes, coaches: 2, date: localDate(), seed: Date.now() })
  await savePlan(plan)
  return plan
}
