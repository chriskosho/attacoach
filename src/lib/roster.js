// Player profiles and what they say about the team. Pure helpers; storage is in db.js.

export const playerName = (p) => [p.first, p.last].filter(Boolean).join(' ').trim()

// Novices count more than strong players: their weak spots are where practice time pays off most.
const WEIGHT = { novice: 1.5, developing: 1.25, solid: 1, strong: 0.75 }

/**
 * Team needs suggested by the roster, most pressing first.
 * A weakness adds to a need (more for lower-rated players); a strength takes a little away.
 * allowed: need ids this division can use. Returns at most `max` ids.
 */
export function rollupNeeds(players = [], allowed = null, max = 5) {
  const score = {}
  for (const p of players) {
    const w = WEIGHT[p.rating] ?? 1
    for (const n of p.weaknesses ?? []) score[n] = (score[n] ?? 0) + w
    for (const n of p.strengths ?? []) score[n] = (score[n] ?? 0) - 0.5
  }
  return Object.entries(score)
    .filter(([n, s]) => s > 0 && (!allowed || allowed.includes(n)))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([n]) => n)
}

// Who the lineup may put on the mound: anyone who lists pitcher.
export const canPitch = (p) => (p.positions ?? []).includes('P')

export function blankPlayer(teamId = null) {
  return {
    id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    teamId,
    first: '',
    last: '',
    rating: null,
    strengths: [],
    weaknesses: [],
    positions: [],
  }
}

// A one-line summary for lists: "Developing, SS 2B P".
export function playerSummary(p, positionShort = (x) => x, ratingLabel = (x) => x) {
  const bits = []
  if (p.rating) bits.push(ratingLabel(p.rating))
  if (p.positions?.length) bits.push(p.positions.map(positionShort).join(' '))
  return bits.join(', ')
}
