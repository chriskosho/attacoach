import { drillById } from '../data/drills.js'
import { drillFor, sportOf } from './sport.js'

const nameOf = (id, sport) => drillFor(drillById(id), sport)?.name
import { focusSummary, coachTitle } from '../data/constants.js'
import { schedule, totalMinutes, fmtClock, pitchNote } from './plan.js'

export function blockTitle(block, sport = 'baseball') {
  if (block.kind === 'break') return 'Water break'
  if (block.kind === 'huddle') return 'Team huddle'
  if (block.kind === 'stations') return `Stations (${block.stations.length} groups rotate)`
  return nameOf(block.drillId, sport) ?? 'Drill'
}

// Plain-text version of a plan for texting to assistant coaches.
export function planText(plan, team, coachName = '') {
  const lines = []
  const sport = sportOf(team)
  lines.push(`${team?.name ?? 'Practice'} practice plan (${team?.division ?? ''}), ${totalMinutes(plan)} min`)
  if (plan.focus?.length) lines.push(`Focus: ${focusSummary(plan.focus)}`)
  lines.push('')
  for (const { block, start, end } of schedule(plan)) {
    lines.push(`${fmtClock(start)}-${fmtClock(end)}  ${blockTitle(block, sport)}`)
    if (block.kind === 'stations') {
      block.stations.forEach((id, i) => {
        const who = staffShort(block.staff?.[i])
        lines.push(`    Station ${i + 1}: ${nameOf(id, sport) ?? id} (${block.stationMinutes} min each)${who ? `, ${who}` : ''}`)
      })
    }
  }
  if (pitchNote(plan, team)) {
    lines.push('')
    lines.push(`Pitchers: ${pitchNote(plan, team)}`)
  }
  lines.push('')
  lines.push(coachName ? `From ${coachTitle(coachName)}, made with AttaCoach` : 'Made with AttaCoach')
  return lines.join('\n')
}

export async function shareText(title, text, url) {
  try {
    if (navigator.share) {
      await navigator.share(url ? { title, text, url } : { title, text })
      return 'shared'
    }
  } catch (err) {
    if (err?.name === 'AbortError') return 'cancelled'
  }
  try {
    await navigator.clipboard.writeText(url ? `${text} ${url}` : text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

// What a station needs, written for the helpers reading a shared plan.
export function staffShort(s) {
  if (!s) return ''
  if (s.type === 'kids') return 'player-led'
  return s.type === 'run' ? 'needs an adult' : 'watch-only'
}
