// Every division, both sports (every softball format) and four practice lengths, each built as a short
// season of plans the way Today builds them. Used by planQuality tests and the before/after report.
import { DIVISIONS, defaultRules } from '../data/constants.js'
import { formatsFor } from '../lib/sport.js'
import { buildPlan, recentPlans } from '../lib/plan.js'
import { drillById } from '../data/drills.js'

export const LENGTHS = [45, 60, 75, 90]

export function matrixTeams() {
  const teams = []
  for (const division of DIVISIONS) {
    const base = { division, experience: 'some', sport: 'baseball', rules: defaultRules(division) }
    teams.push({ ...base, id: `bb-${division}`, needs: [] })
    if (base.rules.kidPitch) teams.push({ ...base, id: `bb-${division}-pitch`, needs: ['pitching', 'catcher', 'contact'] })
    for (const f of formatsFor(division)) {
      const sb = { division, experience: 'some', sport: 'softball', format: f.id, rules: defaultRules(division, 'softball', f.id) }
      teams.push({ ...sb, id: `sb-${division}-${f.id}`, needs: [] })
      if (sb.rules.kidPitch) teams.push({ ...sb, id: `sb-${division}-${f.id}-pitch`, needs: ['pitching', 'catcher', 'contact'] })
    }
  }
  return teams
}

const addDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function matrixRuns(count = 8) {
  const runs = []
  for (const team of matrixTeams()) {
    for (const minutes of LENGTHS) {
      const plans = []
      for (let i = 0; i < count; i++) {
        const date = addDays('2026-03-02', i * 7)
        plans.push(buildPlan(team, { minutes, adults: 3, kids: 12, spaces: ['field'], date, recent: recentPlans(plans, date), seed: 1000 + i * 17 + minutes }))
      }
      runs.push({ team, minutes, plans })
    }
  }
  return runs
}

export const pitchOrCatch = (id) => ['pitching', 'catcher'].includes(drillById(id)?.category)
// Station rounds with two or more pitching or catcher drills.
export const crowdedRounds = (plan) => plan.blocks.filter((b) => b.kind === 'stations' && b.stations.filter(pitchOrCatch).length >= 2)
