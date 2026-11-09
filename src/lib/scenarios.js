import { defaultRules, lengthsFor, needsForDivision, athleticDefault } from '../data/constants.js'
import { DRILLS } from '../data/drills.js'
import { saveTeam, savePlayers, setSetting, db } from './db.js'
import { blankPlayer, rollupNeeds } from './roster.js'

const nearest = (lengths, m) => lengths.reduce((best, l) => (Math.abs(l - m) < Math.abs(best - m) ? l : best), lengths[0])

/**
 * Saves a ready-made scenario as a new team (coach name, rules, practices, equipment, players) and
 * makes it the current team. The coach's name is set unless `keepCoach` is true and one already exists.
 * Returns the saved team.
 */
export async function loadScenario(sc, { keepCoach = false } = {}) {
  const lengths = lengthsFor(sc.division)
  const stamp = Date.now().toString(36)
  const practices = sc.practices.map((p, i) => ({ id: `pr-${stamp}-${i}`, name: p.name, day: p.day ?? null, minutes: nearest(lengths, p.minutes), spaces: p.spaces }))
  const players = sc.players.map((p) => ({ ...blankPlayer(), ...p }))
  const allowed = needsForDivision(sc.division, DRILLS).map((n) => n.id)
  const needs = (sc.needs ?? rollupNeeds(players, allowed)).filter((n) => allowed.includes(n))

  const existing = keepCoach ? await db.settings.get('coachName') : null
  if (sc.coach && !existing?.value) await setSetting('coachName', sc.coach)

  const team = await saveTeam({
    name: sc.name,
    division: sc.division,
    experience: sc.experience,
    played: sc.played ?? null,
    unsure: (sc.unsure ?? []).filter((n) => allowed.includes(n)),
    needs,
    rules: { ...defaultRules(sc.division), ...(sc.rules ?? {}) },
    practices,
    equipment: sc.equipment ?? null,
    athletic: sc.athletic ?? athleticDefault(sc.division),
  })
  await savePlayers(team.id, players.map((p) => ({ ...p, teamId: team.id })))
  return team
}
