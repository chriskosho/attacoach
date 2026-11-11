// Weekly practice rhythm helpers. Pure functions.
import { DEFAULT_PRACTICE, lengthsFor, WEEKDAY_NAMES } from '../data/constants.js'
import { localDate, stationTarget, staffingFor } from './plan.js'

export const teamPractices = (team) => (team?.practices?.length ? team.practices : [DEFAULT_PRACTICE])

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
export function staffingText({ adults, kids, role, young }) {
  const st = staffingFor({ adults, role })
  const n = young && st.adults === 1 ? 1 : stationTarget(kids)
  if (n < 2) return st.adults === 1 ? 'The team stays together and you lead every drill.' : 'The team stays together for most drills.'
  const groups = `about ${n} stations with ${Math.floor(kids / n)}${kids % n ? `-${Math.ceil(kids / n)}` : ''} kids each`
  if (st.adults === 1) return `${cap(groups)}. You run one station and the others are player-led.`
  if (st.coachRole === 'float') return `${cap(groups)}. Your helpers run the stations and you float and manage.`
  return `${cap(groups)}. You run a station and your ${st.helpers === 1 ? 'helper runs' : 'helpers run'} the others, with any extra stations watch-only or player-led.`
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// Who covers a station, in plain words.
export function staffText(s, stationNames = []) {
  if (!s) return ''
  if (s.type === 'kids') return 'Player-led. Set it up where an adult can see it.'
  const who = s.who === 'coach' ? 'You' : s.who === 'helper' ? `Helper ${s.helper}` : null
  if (s.type === 'run') return who ? `${who === 'You' ? 'You run' : `${who} runs`} this station.` : 'Needs an adult to run it.'
  if (who) return `${who === 'You' ? 'You keep' : `${who} keeps`} an eye on this one.`
  if (s.near != null) return `Watch-only. Set it up next to ${stationNames[s.near] ?? 'another station'}.`
  return 'Watch-only. Set it up where an adult can see it.'
}

// A few words on who covers a station, for the rows in the practice timer. Same facts as staffText.
export function staffTag(s) {
  if (!s) return ''
  if (s.type === 'kids') return 'Kids run it'
  const who = s.who === 'coach' ? 'You' : s.who === 'helper' ? `Helper ${s.helper}` : null
  if (s.type === 'run') return who ? (who === 'You' ? 'You run it' : `${who} runs it`) : 'Needs an adult'
  if (who) return who === 'You' ? 'You keep an eye on it' : `${who} keeps an eye on it`
  if (s.near != null) return `Watch from station ${s.near + 1}`
  return 'Watch-only'
}
