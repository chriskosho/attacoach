import { drillById } from '../data/drills.js'
import { needLabel } from '../data/constants.js'
import { schedule, totalMinutes, fmtClock, hasPitching } from './plan.js'

export function blockTitle(block) {
  if (block.kind === 'break') return 'Water break'
  if (block.kind === 'huddle') return 'Team huddle'
  if (block.kind === 'stations') return `Stations (${block.stations.length} groups rotate)`
  return drillById(block.drillId)?.name ?? 'Drill'
}

// Plain-text version of a plan for texting to assistant coaches.
export function planText(plan, team) {
  const lines = []
  lines.push(`${team?.name ?? 'Practice'} practice plan (${team?.division ?? ''}), ${totalMinutes(plan)} min`)
  if (plan.focus?.length) lines.push(`Focus: ${plan.focus.map(needLabel).join(', ')}`)
  lines.push('')
  for (const { block, start, end } of schedule(plan)) {
    lines.push(`${fmtClock(start)}-${fmtClock(end)}  ${blockTitle(block)}`)
    if (block.kind === 'stations') {
      block.stations.forEach((id, i) => {
        lines.push(`    Station ${i + 1}: ${drillById(id)?.name ?? id} (${block.stationMinutes} min each)`)
      })
    }
  }
  if (hasPitching(plan)) {
    lines.push('')
    lines.push('Pitchers: count every pitch and follow league pitch limits and rest days.')
  }
  lines.push('')
  lines.push('Made with AttaCoach')
  return lines.join('\n')
}

export async function shareText(title, text) {
  try {
    if (navigator.share) {
      await navigator.share({ title, text })
      return 'shared'
    }
  } catch (err) {
    if (err?.name === 'AbortError') return 'cancelled'
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
