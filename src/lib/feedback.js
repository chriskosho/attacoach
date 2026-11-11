// Feedback by email. We only build the text; the coach's own email app sends it, after they have
// read it. It never includes a name: not the coach's, not a player's, not the team's.
import { VERSION } from '../changelog.js'
import { FEEDBACK_EMAIL } from '../config.js'
import { drillById } from '../data/drills.js'
import { drillIdsInPlan, totalMinutes } from './plan.js'
import { sportOf, sportLabel, drillFor } from './sport.js'
import { spaceLabel } from '../data/constants.js'

export const feedbackAvailable = (to = FEEDBACK_EMAIL) => !!String(to ?? '').trim()

// The drill names for a plan. A coach's own drills are named by the coach and could hold a name,
// so they show as "one of your own drills".
export function planDrillNames(plan, team) {
  return drillIdsInPlan(plan).map((id) => {
    const d = drillById(id)
    if (!d) return 'A drill that is no longer in the library'
    if (d.custom) return 'One of the coach’s own drills'
    return drillFor(d, team)?.name ?? d.name
  })
}

/**
 * The message. rating: 'up' | 'down' | null. plan is optional (Settings feedback has none).
 * Returns { subject, body } as plain text.
 */
export function feedbackMessage({ team, plan = null, rating = null, note = '' }) {
  const lines = []
  const sport = sportOf(team)
  const sportText = sport === 'softball' && team.format ? `${sportLabel(sport)} (${team.format})` : sportLabel(sport)
  lines.push(`AttaCoach ${VERSION}`)
  lines.push(`Sport: ${sportText}`)
  lines.push(`Age group: ${team.division}`)
  if (plan) {
    lines.push(`Practice length: ${totalMinutes(plan)} minutes`)
    lines.push(`Where: ${(plan.spaces?.length ? plan.spaces : ['field']).map(spaceLabel).join(', ')}`)
    if (rating) lines.push(`Was this plan right? ${rating === 'up' ? 'Yes (thumbs up)' : 'No (thumbs down)'}`)
    lines.push('')
    lines.push('Drills in the plan:')
    for (const n of planDrillNames(plan, team)) lines.push(`- ${n}`)
  }
  lines.push('')
  lines.push('Note:')
  lines.push(note.trim() || '(none)')
  const subject = plan ? `AttaCoach plan feedback${rating ? (rating === 'up' ? ': thumbs up' : ': thumbs down') : ''}` : 'AttaCoach feedback'
  return { subject, body: lines.join('\n') }
}

export function mailtoLink(to, { subject, body }) {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
