// Pure helpers for the moving drill diagrams. A diagram is a few "tracks": for each actor a list of
// [time, x, y] points that the picture moves through, plus the time each written step begins.

// Position along a track at time t (straight lines between points, held at both ends).
export function sample(track, t) {
  if (t <= track[0][0]) return track[0].slice(1)
  for (let i = 1; i < track.length; i++) {
    if (t <= track[i][0]) {
      const a = track[i - 1]
      const b = track[i]
      const k = (t - a[0]) / (b[0] - a[0] || 1)
      return a.slice(1).map((v, j) => v + (b[j + 1] - v) * k)
    }
  }
  return track[track.length - 1].slice(1)
}

// Same as sample, but inside the actor's `curve` window [from, to] the path is a smooth curve
// (Catmull-Rom) through the points, matching the trail drawn by smoothPath.
export function samplePos(actor, t) {
  const c = actor.curve
  if (!c || t < c[0] || t > c[1]) return sample(actor.track, t)
  const pts = actor.track.filter((p) => p[0] >= c[0] && p[0] <= c[1])
  let i = 1
  while (i < pts.length - 1 && t > pts[i][0]) i++
  const p0 = pts[i - 2] ?? pts[i - 1]
  const p1 = pts[i - 1]
  const p2 = pts[i]
  const p3 = pts[i + 1] ?? p2
  const u = (t - p1[0]) / (p2[0] - p1[0] || 1)
  const cr = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * u + (2 * a - 5 * b + 4 * c2 - d) * u * u + (-a + 3 * b - 3 * c2 + d) * u * u * u)
  return [cr(p0[1], p1[1], p2[1], p3[1]), cr(p0[2], p1[2], p2[2], p3[2])]
}

// A smooth SVG path through points (Catmull-Rom turned into curves).
export function smoothPath(pts) {
  if (pts.length < 3) return 'M' + pts.map((p) => p.join(' ')).join(' L')
  let d = `M${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const f = (n) => n.toFixed(1)
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)},${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)},${p2[0]} ${p2[1]}`
  }
  return d
}

// Index of the written step being shown at time t, or -1 before the first step starts.
export function stepAt(at, t) {
  let cur = -1
  at.forEach((s, i) => {
    if (t >= s) cur = i
  })
  return cur
}

// Which key-position drawing is highlighted at time t. `list` is [[time, poseIndex], ...].
export function poseAt(list, t) {
  let p = 0
  list.forEach(([s, i]) => {
    if (t >= s) p = i
  })
  return p
}

export const trailPoints = (actor, from, to) => actor.track.filter((p) => p[0] >= from && p[0] <= to).map((p) => [p[1], p[2]])
