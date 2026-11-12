import { defaultRules, lengthsFor, needsForDivision, athleticDefault } from '../data/constants.js'
import { DRILLS } from '../data/drills.js'
import { blankPlayer, rollupNeeds } from './roster.js'
import { defaultFormat } from './sport.js'

const nearest = (lengths, m) => lengths.reduce((best, l) => (Math.abs(l - m) < Math.abs(best - m) ? l : best), lengths[0])

/**
 * The team and players a ready-made scenario describes, without saving anything. Used when a
 * scenario is loaded and by the plan-quality tests, so both see exactly the same team.
 */
export function teamFromScenario(sc, stamp = Date.now().toString(36)) {
  const lengths = lengthsFor(sc.division)
  const practices = sc.practices.map((p, i) => ({ id: `pr-${stamp}-${i}`, name: p.name, day: p.day ?? null, minutes: nearest(lengths, p.minutes), spaces: p.spaces, ...(p.adults != null ? { adults: p.adults, coachRole: p.coachRole ?? null } : {}) }))
  const players = sc.players.map((p) => ({ ...blankPlayer(), ...p }))
  const allowed = needsForDivision(sc.division, DRILLS).map((n) => n.id)
  const needs = (sc.needs ?? rollupNeeds(players, allowed)).filter((n) => allowed.includes(n))
  const sport = sc.sport ?? 'baseball'
  const format = sport === 'softball' ? sc.format ?? defaultFormat(sc.division) : null
  const team = {
    name: sc.name,
    sport,
    format,
    division: sc.division,
    experience: sc.experience,
    played: sc.played ?? null,
    unsure: (sc.unsure ?? []).filter((n) => allowed.includes(n)),
    needs,
    rules: { ...defaultRules(sc.division, sport, format), ...(sc.rules ?? {}) },
    practices,
    equipment: sc.equipment ?? null,
    athletic: sc.athletic ?? athleticDefault(sc.division),
    adults: sc.adults ?? null,
    coachRole: sc.coachRole ?? 'auto',
  }
  return { team, players }
}
