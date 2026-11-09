// Game debriefs and practice recaps: what the coach saw, and what to work on next.
// Pure helpers. Storage lives in db.js.

// Ratings per area: 1 needs work, 2 okay, 3 strong. Missing means not rated.
export const RATINGS = [
  { value: 1, label: 'Needs work' },
  { value: 2, label: 'OK' },
  { value: 3, label: 'Strong' },
]

// Each area a coach rates maps to the developmental needs the plan engine understands.
export const AREAS = [
  { id: 'hitting', label: 'Hitting', needs: ['contact', 'approach', 'bunting'] },
  { id: 'fielding', label: 'Fielding', needs: ['grounders', 'flyballs', 'catching'] },
  { id: 'throwing', label: 'Throwing', needs: ['throwing'] },
  { id: 'baserunning', label: 'Base running', needs: ['baserunning'] },
  { id: 'pitching', label: 'Pitching and catching', needs: ['pitching', 'catcher'] },
  { id: 'teamplay', label: 'Team play and awareness', needs: ['awareness'] },
]

export const areaLabel = (id) => AREAS.find((a) => a.id === id)?.label ?? id

export const KINDS = {
  game: { label: 'Game', title: 'Game debrief' },
  practice: { label: 'Practice', title: 'Practice recap' },
}

// Newest first: by date, then by when it was written.
export function sortEntries(entries) {
  const key = (e) => `${e.date ?? ''}|${e.createdAt ?? ''}`
  return [...entries].sort((a, b) => (key(a) < key(b) ? 1 : -1))
}

export const weakAreas = (entry) => AREAS.filter((a) => entry.ratings?.[a.id] === 1).map((a) => a.id)
export const strongAreas = (entry) => AREAS.filter((a) => entry.ratings?.[a.id] === 3).map((a) => a.id)

// "W 7-4", "L 2-5" or "T 3-3". Null unless both scores were entered.
export function resultText(entry) {
  const a = entry.ourScore
  const b = entry.theirScore
  if (a == null || b == null || a === '' || b === '') return null
  const x = Number(a)
  const y = Number(b)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return `${x > y ? 'W' : x < y ? 'L' : 'T'} ${x}-${y}`
}

// Newer entries count more. Five entries back is worth a quarter of the newest.
const RECENCY = [1, 0.7, 0.5, 0.35, 0.25]
const SCORE_FOR_RATING = { 1: 2, 2: 0, 3: -1 }
const PICKED_NEXT = 3
const TEAM_NEED_BONUS = 0.5
const MIN_SIGNAL = 0.5

/**
 * What to work on next, from the team's recent debriefs and recaps.
 * Returns null when nothing has been logged that points anywhere.
 * Otherwise { needs: [id, ...up to 3], reasons: { id: { kind, date, why } } }.
 * allowed: need ids this division can use (so a 6U team is not told to work on stealing).
 */
export function suggestFocus(team, entries, allowed = null, max = 3) {
  const recent = sortEntries(entries ?? []).slice(0, RECENCY.length)
  if (!recent.length) return null

  const signal = {}
  const reasons = {}
  recent.forEach((entry, i) => {
    const w = RECENCY[i]
    const note = (need, s, why) => {
      signal[need] = (signal[need] ?? 0) + s * w
      if (s > 0 && (!reasons[need] || reasons[need].weight < s * w)) {
        reasons[need] = { kind: entry.kind, date: entry.date, why, weight: s * w }
      }
    }
    for (const area of AREAS) {
      const r = entry.ratings?.[area.id]
      if (!r) continue
      for (const need of area.needs) note(need, SCORE_FOR_RATING[r], r === 1 ? 'rated needs work' : 'went well')
    }
    for (const need of entry.next ?? []) note(need, PICKED_NEXT, 'picked as next focus')
  })

  const teamNeeds = new Set(team?.needs ?? [])
  const ranked = Object.entries(signal)
    .filter(([need, s]) => s >= MIN_SIGNAL && (!allowed || allowed.includes(need)))
    .map(([need, s]) => ({ need, score: s + (teamNeeds.has(need) ? TEAM_NEED_BONUS : 0) }))
    .sort((a, b) => b.score - a.score || a.need.localeCompare(b.need))
    .slice(0, max)

  if (!ranked.length) return null
  return {
    needs: ranked.map((r) => r.need),
    reasons: Object.fromEntries(ranked.map((r) => [r.need, { kind: reasons[r.need].kind, date: reasons[r.need].date, why: reasons[r.need].why }])),
  }
}
