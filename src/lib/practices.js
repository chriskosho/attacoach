// Weekly practice rhythm helpers. Pure functions.
import { DEFAULT_PRACTICE, lengthsFor, WEEKDAY_NAMES } from '../data/constants.js'
import { localDate, stationTarget, staffingFor } from './plan.js'

export const teamPractices = (team) => (team?.practices?.length ? team.practices : [DEFAULT_PRACTICE])

/**
 * Who is at a practice: the practice's own adults count if it has one, then the team's, then
 * `fallback` (the last count used on this device, for teams saved before the team asked).
 * `own` is true when the practice overrides the team.
 */
export function practiceStaff(team, practice, fallback = 2) {
  const own = practice?.adults != null
  return { adults: own ? practice.adults : team?.adults ?? fallback, own }
}

// "3 adults": the adults line for a team or a practice, in plain words.
export function staffSummary(adults) {
  return adults === 1 ? '1 adult, just you' : `${adults} adults`
}

export function newPractice(division, n = 1) {
  const lengths = lengthsFor(division)
  return {
    id: `pr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: n === 1 ? 'Field practice' : 'Cage practice',
    day: null,
    minutes: lengths.includes(60) ? 60 : lengths[lengths.length - 1],
    spaces: n === 1 ? ['field'] : ['cage', 'open'],
  }
}

const dateFrom = (iso) => new Date(`${iso}T12:00:00`)

/**
 * The practice to plan next, and its date. A practice set for today wins; otherwise the next one
 * this week. Practices without a day are a fallback with today's date.
 */
export function nextPractice(practices, today = localDate()) {
  const base = dateFrom(today)
  const dated = practices.filter((p) => p.day != null)
  let best = null
  for (const p of dated) {
    const ahead = (p.day - base.getDay() + 7) % 7
    if (!best || ahead < best.ahead) best = { practice: p, ahead }
  }
  if (!best) return { practice: practices[0], date: today }
  const d = new Date(base)
  d.setDate(d.getDate() + best.ahead)
  return { practice: best.practice, date: localDate(d) }
}

// The practice that falls on a given date, if any.
export const practiceOn = (practices, iso) => practices.find((p) => p.day != null && p.day === dateFrom(iso).getDay()) ?? null

export const dayName = (day) => (day == null ? '' : WEEKDAY_NAMES[day])

// Plain words for what the adults on hand mean for practice.
export function staffingText({ adults, kids, young }) {
  const st = staffingFor({ adults })
  const n = young && st.adults === 1 ? 1 : stationTarget(kids)
  if (n < 2) return st.adults === 1 ? 'The team stays together and you lead every drill.' : 'The team stays together for most drills.'
  const groups = `about ${n} stations with ${Math.floor(kids / n)}${kids % n ? `-${Math.ceil(kids / n)}` : ''} kids each`
  if (st.adults === 1) return `${cap(groups)}. You run one station and the others are player-led.`
  return `${cap(groups)}. Each adult runs one, with any extra stations watch-only or player-led.`
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// What a station needs, in plain words. It never names who: the coach decides who takes which station.
export function staffText(s, stationNames = []) {
  if (!s) return ''
  if (s.type === 'kids') return 'Player-led. Set it up where an adult can see it.'
  if (s.type === 'run') return 'Needs an adult to run it.'
  if (s.near != null) return `Watch-only. Set it up next to ${stationNames[s.near] ?? 'another station'}.`
  return 'Watch-only. Set it up where an adult can see it.'
}

// A few words on who covers a station, for the rows in the practice timer. Same facts as staffText.
// `from` names the group an adult can watch this station from (for example "Group 1").
export function staffTag(s, from = null) {
  if (!s) return ''
  if (s.type === 'kids') return 'Kids run it'
  if (s.type === 'run') return 'Needs an adult'
  if (s.near != null) return from ? `Kids run it. Keep an eye from ${from}` : `Watch from station ${s.near + 1}`
  return 'Watch-only'
}
