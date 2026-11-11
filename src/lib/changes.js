// What a change of plans did: which drills stayed, which were swapped out, and why.
import { drillById } from '../data/drills.js'
import { drillIdsInPlan, availableSpaces, spaceFits } from './plan.js'
import { drillFor, sportOf } from './sport.js'

const SPACE_WORDS = { field: 'a full field', cage: 'a batting cage', open: 'open grass', gym: 'indoor space' }
const joinWords = (list) => (list.length <= 1 ? list[0] ?? '' : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`)
const orWords = (list) => (list.length <= 1 ? list[0] ?? '' : `${list.slice(0, -1).join(', ')} or ${list[list.length - 1]}`)

// The most likely reason a drill left the plan, or null when it only lost its place.
function reasonFor(drill, before, after) {
  if (!drill) return 'it is no longer in the library'
  if (!spaceFits(drill, availableSpaces(after.spaces))) return `it needs ${orWords(drill.where.map((w) => SPACE_WORDS[w] ?? w))}`
  if (drill.cap?.[0] > after.kids) return `it needs at least ${drill.cap[0]} players`
  if (drill.staff === 'run' && (after.adults ?? 1) < (before.adults ?? 1)) return 'it needs an adult to run it'
  if (after.minutes < before.minutes) return 'practice is shorter'
  return null
}

/**
 * Compares a plan with its rebuilt version. Returns
 *   { dropped: [{ id, name, reason }], added: [{ id, name }], kept, total, lines }
 * where lines is one or two sentences for the coach.
 */
export function describeChanges(team, before, after) {
  const sport = sportOf(team)
  const name = (id) => drillFor(drillById(id), sport)?.name ?? id
  const was = [...new Set(drillIdsInPlan(before))]
  const now = [...new Set(drillIdsInPlan(after))]
  const wasSet = new Set(was)
  const nowSet = new Set(now)
  const dropped = was.filter((id) => !nowSet.has(id)).map((id) => ({ id, name: name(id), reason: reasonFor(drillById(id), before, after) }))
  const added = now.filter((id) => !wasSet.has(id)).map((id) => ({ id, name: name(id) }))
  const kept = was.length - dropped.length

  const lines = []
  if (dropped.length) {
    const groups = new Map()
    for (const d of dropped) groups.set(d.reason ?? '', [...(groups.get(d.reason ?? '') ?? []), d.name])
    const sentences = [...groups.entries()].filter(([r]) => r).map(([reason, names]) => `Swapped ${joinWords(names)}: ${reason}.`)
    const rest = groups.get('') ?? []
    if (rest.length) sentences.push(`${sentences.length ? 'Also swapped' : 'Swapped'} ${joinWords(rest)} to fit the new plan.`)
    lines.push(sentences.join(' '))
    lines.push(`Kept ${kept} of ${was.length} drills${added.length ? `. New: ${joinWords(added.map((a) => a.name))}` : ''}.`)
  } else {
    lines.push('Every drill still fits.')
    lines.push(`Groups and times were adjusted for ${after.kids} ${after.kids === 1 ? 'kid' : 'kids'} and ${after.adults} ${after.adults === 1 ? 'adult' : 'adults'}.`)
  }
  return { dropped, added, kept, total: was.length, lines }
}
