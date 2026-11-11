// Baseball or softball: the team setting, softball formats, and the wording that changes with the sport.
// A team without a sport (every team made before this setting existed) is a baseball team.

export const SPORTS = [
  { id: 'baseball', label: 'Baseball' },
  { id: 'softball', label: 'Softball' },
]

// Softball formats. Slowpitch is an adult game and is left out. Tee ball is offered for 6U only.
export const FORMATS = [
  { id: 'fastpitch', label: 'Fastpitch', help: 'Players pitch underhand.' },
  { id: 'coach-pitch', label: 'Coach pitch', help: 'A coach pitches to the hitters.' },
  { id: 'tee-ball', label: 'Tee ball', help: 'Hitters hit off a tee.', divisions: ['6U'] },
]

export const sportOf = (team) => (team?.sport === 'softball' ? 'softball' : 'baseball')
export const sportLabel = (sport) => SPORTS.find((s) => s.id === sport)?.label ?? 'Baseball'

export const formatsFor = (division) => FORMATS.filter((f) => !f.divisions || f.divisions.includes(division))

// A starting format by age; the coach changes it to match the league.
export function defaultFormat(division) {
  if (division === '6U') return 'tee-ball'
  if (division === '4U' || division === '8U') return 'coach-pitch'
  return 'fastpitch'
}

// The team's softball format, kept valid for its division. Baseball teams have none.
export function formatOf(team) {
  if (sportOf(team) !== 'softball') return null
  const ok = formatsFor(team.division).map((f) => f.id)
  return ok.includes(team.format) ? team.format : defaultFormat(team.division)
}

export const formatLabel = (id) => FORMATS.find((f) => f.id === id)?.label ?? ''

// "Baseball" or "Softball, coach pitch" for headers and summaries.
export function sportSummary(team) {
  const sport = sportOf(team)
  return sport === 'softball' ? `Softball, ${formatLabel(formatOf(team)).toLowerCase()}` : 'Baseball'
}

// Whether a drill fits the team's sport. Drills tagged for one sport are left out of the other.
export const sportFits = (drill, team) => !drill.sport || drill.sport === sportOf(team)

// The drill as a team should read it: softball teams get the drill's softball wording where it has
// any (name, equipment, setup, steps, points, easier, harder). Everything else is shared.
const TEXT_FIELDS = ['name', 'equipment', 'setup', 'steps', 'points', 'easier', 'harder']
export function drillFor(drill, teamOrSport) {
  if (!drill) return drill
  const sport = typeof teamOrSport === 'string' ? teamOrSport : sportOf(teamOrSport)
  if (sport !== 'softball' || !drill.softball) return drill
  const out = { ...drill }
  for (const k of TEXT_FIELDS) if (drill.softball[k] !== undefined) out[k] = drill.softball[k]
  return out
}

// General copy that names the sport (coaching tips and the like). Text that already names both
// sports is left alone.
export function sportText(text, sport) {
  if (sport !== 'softball' || typeof text !== 'string') return text
  if (/baseball (and|or) softball/i.test(text)) return text.replace(/\bmound\b/g, 'circle')
  return text
    .replace(/\bthe mound\b/g, 'the circle')
    .replace(/\bmound\b/g, 'circle')
    .replace(/\bBaseball\b/g, 'Softball')
    .replace(/\bbaseball\b/g, 'softball')
}

// The same for whole objects and lists of copy (coaching moments, huddles and so on).
export function sportCopy(value, sport) {
  if (sport !== 'softball') return value
  if (typeof value === 'string') return sportText(value, sport)
  if (Array.isArray(value)) return value.map((v) => sportCopy(v, sport))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, typeof v === 'function' ? v : sportCopy(v, sport)]))
  return value
}

// Rule wording for the team's sport. Leagues differ, so the help never states a league's rule as fact.
const SOFTBALL_RULES = {
  kidPitch: { label: 'Players pitch', help: 'Kids pitch underhand to each other (instead of a tee or coach pitch).' },
  leadoff: { label: 'Leaving on the pitch', help: 'Runners may leave the base once the pitcher releases the ball.' },
}
export function ruleText(rule, sport) {
  const s = sport === 'softball' ? SOFTBALL_RULES[rule.id] : null
  return { label: s?.label ?? rule.label, help: s?.help ?? rule.help }
}
