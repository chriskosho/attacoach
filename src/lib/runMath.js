// Pure math for the practice timer: catching up after the screen slept, trimming a late
// practice, and measuring how far behind it is. No React and no clock in here, so it is easy to test.

/**
 * Moves forward through the blocks an away period covers.
 *   seconds: each segment's length, in order
 *   index:   the current segment
 *   elapsed: seconds already used in the current segment
 *   away:    more seconds that have passed since then
 * Returns { index, elapsed, done, moved }: the segment to land on, how much of it is used, whether
 * practice is over, and how many segments were passed.
 */
export function catchUp(seconds, index, elapsed, away) {
  let i = index
  let used = elapsed + Math.max(0, away)
  let moved = 0
  while (i < seconds.length && used >= seconds[i]) {
    used -= seconds[i]
    i++
    moved++
  }
  if (i >= seconds.length) return { index: seconds.length - 1, elapsed: 0, done: true, moved }
  return { index: i, elapsed: used, done: false, moved }
}

// How many seconds practice is behind its original end time. Pauses, +1 minute and time spent
// over a block all count; skipping ahead gives time back.
export function behindSeconds({ startedWall, now, totalNow, doneNow, totalPlanned, maxAge = 4 * 3600 }) {
  if (startedWall == null) return 0
  const used = (now - startedWall) / 1000
  if (used < 0 || used > maxAge) return 0
  return Math.round(used + (totalNow - doneNow) - totalPlanned)
}

export const TRIM_FLOOR = 0.6

/**
 * Shortens the drill blocks still ahead to win back `behind` seconds. Each one gives up time in
 * proportion to how much it can give, and none goes below 60% of its planned length. Water
 * breaks, huddles and the block being run are never touched.
 *   segs: [{ key, kind, blockIndex, base, seconds }]  (base is the planned length)
 * Returns { seconds: { key: newSeconds }, cut, wanted, blocks, capped }.
 */
export function trimSegments(segs, currentBlockIndex, behind) {
  const ahead = segs.filter((s) => s.blockIndex > currentBlockIndex && (s.kind === 'drill' || s.kind === 'stations'))
  const room = (s) => Math.max(0, s.seconds - Math.ceil(s.base * TRIM_FLOOR))
  const maxCut = ahead.reduce((n, s) => n + room(s), 0)
  const wanted = Math.max(0, Math.round(behind))
  const cut = Math.min(wanted, maxCut)
  const seconds = {}
  if (cut <= 0) return { seconds, cut: 0, wanted, blocks: 0, capped: wanted > 0 }
  let given = 0
  const blocks = new Set()
  for (const s of ahead) {
    const take = Math.min(room(s), Math.round((room(s) * cut) / maxCut))
    if (take <= 0) continue
    seconds[s.key] = s.seconds - take
    given += take
    blocks.add(s.blockIndex)
  }
  return { seconds, cut: given, wanted, blocks: blocks.size, capped: given < wanted }
}
