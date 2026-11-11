// Moving diagrams for drills where space and movement are the point. Drawn from above in a
// 300 x 300 box, not to scale. The written steps come from the drill itself; `at` says when each
// step begins (seconds into the loop), so the picture and the text stay together.
//
// actor kinds: runner, fielder, kid, coach (a dot with a letter), ball, bat (held by the first kid).
// track: [[time, x, y], ...]   (a bat's track is [[time, angleDegrees], ...]; 0 = pointing right)
// curve: [from, to] draws that stretch of the track as a smooth curve (a runner's turn).
// trail: the route an actor takes, shown faint, and solid as they run it.
// pops: speech bubbles above an actor. labels: big text shown between two times.
// The last frame of each loop matches the first, so it repeats without a jump.

import { STAR } from './diagramBg.js'

const W = '#f6f6ee'
const Y = '#f2c230'
const O = '#ff8a3d'

// ---------------------------------------------------------------- Round first on a hit
// Cone 10 feet before first and a few feet foul. The runner bows out early (the banana), passes
// outside the cone, hits the inside corner, takes a few hard steps toward second, finds the ball
// (the coach in left field has it) and gets back.
const roundingFirst = {
  len: 9.6,
  bg: 'field',
  extras: '<polygon points="223,185 229,196 217,196" class="dg-cone"/><text x="240" y="212" class="dg-lab">cone</text>',
  at: [1.2, 4.0, 4.8],
  actors: [
    { kind: 'runner', label: 'R', fill: Y, curve: [1.2, 5.7], track: [[0, 146, 250], [1.2, 146, 250], [2.1, 175, 228], [2.8, 203, 217], [3.4, 223, 204], [3.8, 230, 190], [4.2, 227, 173], [4.6, 214, 160], [5.0, 203, 149], [5.7, 192, 138], [6.8, 192, 138], [8.0, 227, 170], [9.6, 227, 170]] },
    { kind: 'coach', label: 'C', fill: O, track: [[0, 62, 64], [1.6, 62, 64], [3.0, 78, 84], [9.6, 78, 84]] },
    { kind: 'ball', vis: [1.0, 9.0], track: [[1.0, 150, 244], [2.4, 88, 96], [3.0, 80, 86], [9.6, 80, 86]] },
  ],
  trail: { actor: 0, from: 1.2, to: 5.7 },
  pops: [
    { t0: 5.6, t1: 6.8, at: 0, text: 'Find the ball' },
    { t0: 5.8, t1: 6.8, at: 1, text: 'Got it' },
    { t0: 7.0, t1: 8.6, at: 0, text: 'Back to the bag' },
  ],
}

// ---------------------------------------------------------------- Pickle
// Close-up of two bases. The fielder with the ball runs hard at the runner, chasing them back
// toward 1st. The partner calls "now!" when the runner is a few steps away; one throw, one tag.
// Then the thrower follows the throw, the catcher takes the ball to the other end, next runner in.
const pickle = {
  len: 10,
  bg: 'basepath',
  at: [1.0, 2.6, 5.8],
  actors: [
    { kind: 'fielder', label: '', fill: W, track: [[0, 54, 150], [2.4, 54, 150], [3.5, 64, 150], [3.8, 70, 150], [4.2, 82, 150], [5.8, 82, 150], [7.2, 150, 132], [8.6, 246, 150], [10, 246, 150]] },
    { kind: 'fielder', label: '', fill: W, track: [[0, 246, 150], [1.0, 246, 150], [3.5, 118, 150], [3.8, 112, 150], [5.8, 112, 150], [7.0, 84, 168], [8.2, 54, 150], [10, 54, 150]] },
    { kind: 'runner', label: 'R', fill: Y, track: [[0, 150, 150], [1.2, 150, 150], [3.8, 86, 150], [4.0, 84, 151], [4.2, 87, 151], [5.8, 87, 151], [7.6, 150, 232], [10, 150, 232]] },
    { kind: 'runner', label: 'R', fill: Y, track: [[0, 150, 232], [5.8, 150, 232], [8.0, 150, 150], [10, 150, 150]] },
    { kind: 'ball', track: [[0, 246, 138], [1.0, 246, 138], [3.5, 118, 138], [3.65, 94, 132], [3.8, 70, 142], [4.2, 82, 142], [5.8, 82, 142], [7.2, 150, 120], [8.6, 246, 138], [10, 246, 138]] },
  ],
  pops: [
    { t0: 1.2, t1: 2.8, at: 1, text: 'Ball up, run hard' },
    { t0: 3.0, t1: 3.7, at: 0, text: 'NOW!' },
    { t0: 4.3, t1: 5.6, at: 2, text: 'Out' },
  ],
  labels: [{ t0: 5.8, t1: 9.8, x: 14, y: 70, text: 'One throw. Rotate.' }],
}

// ---------------------------------------------------------------- Tee work
// The coach is part of the station: checks the stance, stands at the coach spot (to the side,
// out of the swing and the ball's path) during each swing, re-tees and gives one cue. About ten
// swings per hitter; the loop shows the first two and the last, then the next hitter steps in.
const swings = [2.0, 5.6, 9.2]
const bat = []
swings.forEach((s, k) => {
  const b = -360 * k
  bat.push([s, 120 + b], [s + 0.8, 140 + b], [s + 1.4, 60 + b], [s + 1.7, b], [s + 2.1, -80 + b], [s + 2.5, -160 + b], [s + 3.2, -240 + b])
})
const hit = (s, x) => [[s - 1.0, 150, 176], [s + 1.7, 150, 176], [s + 2.1, x, 54], [12.8, x, 54]]
const kid = (track) => ({ kind: 'kid', fill: W, label: '', track })
const teeWork = {
  len: 14,
  bg: 'cage',
  at: [0, 2.0, 5.6],
  poses: 'swing',
  poseAt: swings.flatMap((s) => [[s - 0.6, 0], [s + 0.6, 1], [s + 1.6, 2], [s + 2.2, 3], [s + 3.0, 0]]),
  actors: [
    kid([[0, 128, 176], [12.0, 128, 176], [12.6, 92, 206], [13.2, 30, 226], [13.8, 30, 252], [14, 30, 252]]),
    { kind: 'coach', label: 'C', fill: O, track: [[0, 214, 222], [0.4, 214, 222], [0.9, 128, 210], [1.5, 128, 210], [1.9, 214, 222], [4.2, 214, 222], [4.6, 162, 190], [5.0, 162, 190], [5.4, 214, 222], [7.8, 214, 222], [8.2, 162, 190], [8.6, 162, 190], [9.0, 214, 222], [14, 214, 222]] },
    kid([[0, 104, 252], [12.4, 104, 252], [13.4, 128, 176], [14, 128, 176]]),
    kid([[0, 80, 252], [12.4, 80, 252], [13.4, 104, 252], [14, 104, 252]]),
    kid([[0, 56, 252], [12.4, 56, 252], [13.4, 80, 252], [14, 80, 252]]),
    kid([[0, 30, 252], [12.4, 30, 252], [13.4, 56, 252], [14, 56, 252]]),
    kid([[0, 268, 96], [12.0, 268, 96], [12.6, 160, 60], [13.0, 160, 60], [13.6, 268, 96], [14, 268, 96]]),
    kid([[0, 268, 122], [12.0, 268, 122], [12.6, 146, 62], [13.0, 146, 62], [13.6, 268, 122], [14, 268, 122]]),
    { kind: 'bat', vis: [0, 12.0], track: [[0, 120], ...bat] },
    { kind: 'ball', vis: [0, 12.8], track: [[0, 150, 176], ...hit(swings[0], 156).slice(1)] },
    { kind: 'ball', vis: [4.8, 12.8], track: hit(swings[1], 138).map((p, i) => (i ? p : [4.8, 150, 176])) },
    { kind: 'ball', vis: [8.4, 12.8], track: hit(swings[2], 168).map((p, i) => (i ? p : [8.4, 150, 176])) },
  ],
  pops: [
    { t0: 0.9, t1: 1.8, at: 1, text: 'Check stance', below: true },
    { t0: 4.5, t1: 5.4, at: 1, text: 'Eyes on the ball', below: true },
    { t0: 8.1, t1: 9.0, at: 1, text: 'Finish high', below: true },
    { t0: 11.8, t1: 12.8, at: 1, text: 'Nice. Next hitter.', below: true },
  ],
  labels: [
    { t0: 2.0, t1: 5.4, x: 14, y: 84, text: 'Swing 1 of 10' },
    { t0: 5.6, t1: 9.0, x: 14, y: 84, text: 'Swing 2 of 10' },
    { t0: 9.2, t1: 11.9, x: 14, y: 84, text: '… swing 10 of 10' },
    { t0: 12.0, t1: 14.1, x: 14, y: 84, text: 'Next hitter' },
  ],
}

// ---------------------------------------------------------------- Star drill
// Five cones, six players (two at the first cone). The ball goes across the star, skipping a cone
// each time, so it draws a star; each thrower runs to the cone they threw to. After five throws the
// ball is back at the first cone and everyone is in the same spots, so the loop carries on.
const spot = (i, back = 0) => {
  const [x, y] = STAR[i]
  const dx = x - 150
  const dy = y - 152
  const r = Math.hypot(dx, dy)
  const k = (r + 14 + back * 20) / r
  return [Math.round(150 + dx * k), Math.round(152 + dy * k)]
}
const ORDER = [0, 2, 4, 1, 3, 0]
const T = (k) => 1.0 + 1.3 * k // when throw k leaves
const starLen = 9.6
const thrower = (k) => {
  const a = spot(ORDER[k])
  const b = spot(ORDER[k + 1], k === 4 ? 1 : 0)
  const start = k === 0 ? [[0, ...a]] : [[0, ...a], [T(k - 1) + 0.6, ...a]]
  return { kind: 'fielder', label: '', fill: W, track: [...start, [T(k) + 0.15, ...a], [T(k) + 2.3, ...b], [starLen, ...b]] }
}
const starBall = [[0, ...spot(0)]]
for (let k = 0; k < 5; k++) starBall.push([T(k), ...spot(ORDER[k])], [T(k) + 0.6, ...spot(ORDER[k + 1])])
starBall.push([starLen, ...spot(0)])
const starDrill = {
  len: starLen,
  bg: 'star',
  at: [1.0, 2.4, T(4) + 0.6],
  actors: [
    thrower(0),
    thrower(1),
    thrower(2),
    thrower(3),
    thrower(4),
    { kind: 'fielder', label: '', fill: W, track: [[0, ...spot(0, 1)], [T(0) + 0.3, ...spot(0, 1)], [T(0) + 0.9, ...spot(0)], [starLen, ...spot(0)]] },
    { kind: 'ball', track: starBall },
  ],
  pops: [{ t0: 1.3, t1: 2.6, at: 0, text: 'Follow your throw' }],
  labels: [1, 2, 3, 4, 5].map((n) => ({ t0: T(n - 1) + 0.6, t1: n === 5 ? starLen : T(n) + 0.6, x: 14, y: 290, text: `${n} in a row` })),
}

// ---------------------------------------------------------------- Front toss
// The coach leans out to toss through the low side of the screen, then gets fully behind the tall
// side before the ball is hit. A line drive up the middle hits the screen, which is why.
const tossSwings = [1.6, 5.0, 8.4]
const tossBat = [[0, 120]]
tossSwings.forEach((s, k) => {
  const b = -360 * k
  tossBat.push([s - 0.2, 120 + b], [s + 0.3, 140 + b], [s + 0.5, 60 + b], [s + 0.7, b], [s + 1.0, -80 + b], [s + 1.4, -160 + b], [s + 2.1, -240 + b])
})
const BEHIND = [140, 102]
const LEAN = [166, 108]
const coachToss = [[0, ...BEHIND]]
tossSwings.forEach((s) => coachToss.push([s - 0.5, ...BEHIND], [s - 0.2, ...LEAN], [s + 0.05, ...LEAN], [s + 0.4, ...BEHIND]))
coachToss.push([13.5, ...BEHIND])
const tossed = (s, to, vis1) => ({ kind: 'ball', vis: [s - 0.3, vis1], track: [[s - 0.3, 168, 112], [s, 168, 112], [s + 0.7, 150, 228], [s + 1.1, ...to], [13.5, ...to]] })
const frontToss = {
  len: 13.5,
  bg: 'toss',
  at: [1.4, 2.3, 5.0],
  actors: [
    kid([[0, 128, 230], [11.6, 128, 230], [12.1, 72, 232], [12.6, 22, 254], [13.0, 30, 284], [13.5, 30, 284]]),
    { kind: 'coach', label: 'C', fill: O, track: coachToss },
    kid([[0, 102, 284], [12.0, 102, 284], [13.0, 128, 230], [13.5, 128, 230]]),
    kid([[0, 78, 284], [12.0, 78, 284], [13.0, 102, 284], [13.5, 102, 284]]),
    kid([[0, 54, 284], [12.0, 54, 284], [13.0, 78, 284], [13.5, 78, 284]]),
    kid([[0, 30, 284], [12.0, 30, 284], [13.0, 54, 284], [13.5, 54, 284]]),
    { kind: 'bat', vis: [0, 11.6], track: tossBat },
    tossed(tossSwings[0], [146, 126], 11.6),
    tossed(tossSwings[1], [236, 22], 6.0),
    tossed(tossSwings[2], [70, 22], 9.4),
  ],
  pops: [
    { t0: 2.0, t1: 3.2, at: 1, text: 'Behind the screen' },
    { t0: 11.4, t1: 12.4, at: 1, text: 'Next hitter' },
  ],
  labels: [
    { t0: 1.3, t1: 4.7, x: 196, y: 172, text: 'Swing 1 of 10' },
    { t0: 4.7, t1: 8.1, x: 196, y: 172, text: 'Swing 2 of 10' },
    { t0: 8.1, t1: 11.5, x: 190, y: 172, text: '… swing 10' },
  ],
}

// ---------------------------------------------------------------- Cutoffs and relays
// One common play, start to finish: single to center with a runner on second. The first baseman
// lines up between the center fielder and home; the catcher sees the runner will score and calls
// "Cut! Two!", so the cutoff throws to second for the batter-runner.
const F = (label, track) => ({ kind: 'fielder', label, fill: W, track })
const cutoffs = {
  len: 9,
  bg: 'field',
  at: [1.0, 2.2, 3.0],
  actors: [
    F('CF', [[0, 150, 28], [1.2, 150, 28], [2.4, 160, 46], [9, 160, 46]]),
    F('LF', [[0, 64, 50], [1.2, 64, 50], [2.6, 126, 38], [9, 126, 38]]),
    F('RF', [[0, 236, 50], [1.2, 236, 50], [2.6, 192, 44], [9, 192, 44]]),
    F('1B', [[0, 222, 158], [1.2, 222, 158], [2.8, 153, 192], [3.6, 153, 192], [3.9, 153, 194], [9, 153, 194]]),
    F('2B', [[0, 188, 122], [1.2, 188, 122], [2.8, 226, 166], [9, 226, 166]]),
    F('SS', [[0, 112, 126], [1.2, 112, 126], [3.4, 146, 98], [9, 146, 98]]),
    F('3B', [[0, 78, 162], [1.2, 78, 162], [2.4, 70, 178], [9, 70, 178]]),
    F('P', [[0, 150, 170], [1.4, 150, 170], [3.6, 150, 284], [9, 150, 284]]),
    F('C', [[0, 150, 266], [9, 150, 266]]),
    { kind: 'runner', label: 'R', fill: Y, track: [[0, 140, 104], [1.0, 140, 104], [2.8, 70, 170], [4.8, 148, 250], [9, 148, 250]] },
    { kind: 'runner', label: 'B', fill: Y, curve: [1.0, 4.9], track: [[0, 140, 252], [1.0, 140, 252], [2.2, 196, 214], [3.0, 230, 182], [3.5, 222, 160], [4.2, 186, 124], [4.9, 160, 100], [9, 160, 100]] },
    { kind: 'ball', track: [[0, 150, 246], [1.0, 150, 246], [1.6, 150, 160], [2.4, 160, 52], [3.0, 160, 52], [3.6, 153, 186], [3.9, 153, 186], [4.4, 150, 100], [4.9, 155, 100], [9, 155, 100]] },
  ],
  guides: [{ t0: 2.4, t1: 3.9, from: [160, 46], to: [150, 252] }],
  pops: [
    { t0: 2.6, t1: 3.5, at: 3, text: 'Hands up!' },
    { t0: 3.1, t1: 3.9, at: 8, text: 'Cut! Two!', below: true },
    { t0: 4.9, t1: 6.4, at: 10, text: 'Out' },
  ],
  labels: [{ t0: 0, t1: 2.6, x: 10, y: 292, text: 'Single to center, runner on 2nd' }],
}

// ---------------------------------------------------------------- Shared helpers for full-field plays
// Standard spots on the full diamond (see BG.field): home (150,252), 1st (232,172), 2nd (150,92),
// 3rd (68,172), mound (150,172).
const SPOT = {
  P: [150, 172], C: [150, 266], '1B': [222, 158], '2B': [188, 122], SS: [112, 126], '3B': [78, 162],
  LF: [64, 50], CF: [150, 28], RF: [236, 50],
}
// A track that sits at `from`, moves to `to` during each [go, arrive] window, and comes back during
// each [leave, back] window: windows = [[go, arrive, leave, back], ...].
const goAndBack = (from, to, windows, len) => {
  const t = [[0, ...from]]
  for (const [g, a, l, b] of windows) t.push([g, ...from], [a, ...to], [l, ...to], [b, ...from])
  t.push([len, ...from])
  return t
}

// ---------------------------------------------------------------- Everybody moves
// Ground ball to short, nobody on. First a walk-through: the coach calls it, everyone walks to their
// job (the dashed lines are the pretend ball and throw), freeze and check. Then the same play with a
// real ball at game speed. Jobs: SS fields, 1B covers the bag, 2B covers second, the catcher runs
// down the line to back up first, RF backs up first, LF backs up short, CF backs up second.
const EM_LEN = 13.6
const walk = [1.2, 3.4, 6.0, 7.6]
const live = [8.0, 9.4, 11.4, 12.8]
const em = (label, to, viaCatcher) => {
  const from = SPOT[label]
  if (!viaCatcher) return F(label, goAndBack(from, to, [walk, live], EM_LEN))
  // The catcher goes down the line in foul territory, never across the infield.
  const v = [196, 240]
  const track = [[0, ...from]]
  for (const [g, a, l, b] of [walk, live]) {
    const m = g + (a - g) * 0.45
    const mb = l + (b - l) * 0.55
    track.push([g, ...from], [m, ...v], [a, ...to], [l, ...to], [mb, ...v], [b, ...from])
  }
  track.push([EM_LEN, ...from])
  return F(label, track)
}
const COACH_AT_HOME = [124, 258]
const everybodyMoves = {
  len: EM_LEN,
  bg: 'field',
  at: [0.3, 1.2, 4.0],
  actors: [
    em('SS', [114, 136]),
    em('1B', [226, 166]),
    em('2B', [158, 100]),
    em('3B', [74, 168]),
    F('P', [[0, ...SPOT.P], [EM_LEN, ...SPOT.P]]),
    em('C', [252, 196], true),
    em('RF', [276, 180]),
    em('LF', [96, 82]),
    em('CF', [150, 62]),
    { kind: 'coach', label: '', fill: O, track: [[0, ...COACH_AT_HOME], [EM_LEN, ...COACH_AT_HOME]] },
    // In the coach's hand for the walk-through, then hit to short, thrown to first, and tossed back.
    { kind: 'ball', track: [[0, 128, 254], [8.0, 128, 254], [8.7, 114, 140], [9.0, 116, 136], [9.5, 222, 164], [11.6, 222, 164], [12.6, 128, 254], [EM_LEN, 128, 254]] },
  ],
  guides: [
    { t0: 0.5, t1: 4.4, from: [124, 252], to: [114, 136] },
    { t0: 2.4, t1: 5.6, from: [114, 136], to: [226, 166] },
  ],
  pops: [
    { t0: 0.3, t1: 1.6, at: 9, text: 'Ground ball to short!' },
    { t0: 1.8, t1: 2.8, at: 2, text: 'Cover 2nd' },
    { t0: 2.6, t1: 3.8, at: 7, text: 'Back up short' },
    { t0: 3.0, t1: 4.4, at: 5, text: 'Back up 1st', below: true },
  ],
  labels: [
    { t0: 0, t1: 3.9, x: 10, y: 292, text: 'First, a walk-through' },
    { t0: 4.0, t1: 6.0, x: 10, y: 292, text: 'Freeze! Check every spot' },
    { t0: 7.8, t1: 10.8, x: 10, y: 292, text: 'Now with a real ball' },
  ],
}

// ---------------------------------------------------------------- Pitcher covers first
// Ball to the right side. The first baseman fields it; the pitcher breaks for a spot on the line a
// few steps before the bag, runs up the line, takes the underhand toss, steps on the inside edge of
// the bag and turns into the infield.
const PC_LEN = 7.6
const pitcherCoversFirst = {
  len: PC_LEN,
  bg: 'field',
  at: [0.6, 1.5, 2.0],
  actors: [
    F('P', [[0, ...SPOT.P], [0.6, ...SPOT.P], [1.2, 180, 188], [1.6, 203, 197], [2.1, 216, 186], [2.4, 222, 180], [2.65, 228, 174], [3.2, 216, 164], [5.0, 216, 164], [6.4, ...SPOT.P], [PC_LEN, ...SPOT.P]]),
    F('1B', [[0, ...SPOT['1B']], [0.6, ...SPOT['1B']], [1.3, 210, 144], [5.0, 210, 144], [6.2, ...SPOT['1B']], [PC_LEN, ...SPOT['1B']]]),
    { kind: 'coach', label: '', fill: O, track: [[0, 140, 256], [PC_LEN, 140, 256]] },
    { kind: 'ball', track: [[0, 144, 252], [0.6, 144, 252], [1.4, 208, 148], [2.0, 208, 148], [2.4, 220, 176], [2.65, 226, 170], [3.2, 214, 160], [5.0, 214, 160], [5.4, 214, 160], [6.4, 144, 252], [PC_LEN, 144, 252]] },
  ],
  trail: { actor: 0, from: 0.6, to: 2.65 },
  extras: '<circle cx="203" cy="197" r="5" class="dg-spot"/>',
  pops: [
    { t0: 0.7, t1: 1.6, at: 0, text: 'Every ball right side: go' },
    { t0: 1.65, t1: 2.3, at: 0, text: 'Then up the line' },
    { t0: 2.0, t1: 2.5, at: 1, text: 'Toss', below: true },
    { t0: 2.8, t1: 4.2, at: 0, text: 'Step on the inside edge' },
  ],
  labels: [{ t0: 3.4, t1: 5.2, x: 10, y: 292, text: 'Turn into the infield' }],
}

// ---------------------------------------------------------------- Bunt defense
// Runner on first. The batter bunts toward third. Corners charge, the pitcher covers the middle, the
// second baseman goes inside the baseline (behind the runner's path) to cover first, and the
// shortstop covers second. The catcher calls "One!" and the third baseman takes the sure out.
const BD_LEN = 9.6
const bd = (label, track) => F(label, [...track, [BD_LEN, ...track[0].slice(1)]])
const buntDefense = {
  len: BD_LEN,
  bg: 'field',
  at: [0.95, 1.8, 2.9],
  actors: [
    bd('3B', [[0, 82, 160], [0.95, 82, 160], [1.95, 118, 206], [5.8, 118, 206], [7.0, 82, 160]]),
    bd('1B', [[0, 222, 160], [0.95, 222, 160], [1.9, 184, 198], [7.2, 184, 198], [8.0, 222, 160]]),
    bd('P', [[0, 150, 172], [0.95, 150, 172], [1.8, 148, 206], [5.8, 148, 206], [6.8, 150, 172]]),
    bd('2B', [[0, 206, 110], [0.9, 206, 110], [1.15, 198, 140], [1.6, 200, 162], [1.9, 200, 162], [2.4, 220, 164], [7.0, 220, 164], [7.4, 206, 136], [7.8, 206, 110]]),
    bd('SS', [[0, 112, 126], [0.95, 112, 126], [2.0, 140, 96], [6.0, 140, 96], [7.0, 112, 126]]),
    bd('C', [[0, 150, 266]]),
    { kind: 'runner', label: 'R', fill: Y, track: [[0, 240, 166], [1.1, 240, 166], [3.4, 160, 100], [6.0, 160, 100], [6.6, 220, 130], [7.0, 244, 156], [7.4, 240, 166], [BD_LEN, 240, 166]] },
    { kind: 'runner', label: 'B', fill: Y, track: [[0, 136, 250], [1.0, 136, 250], [2.0, 186, 226], [2.8, 230, 182], [3.0, 238, 176], [6.8, 238, 176], [7.6, 186, 230], [8.4, 136, 250], [BD_LEN, 136, 250]] },
    { kind: 'ball', track: [[0, 150, 166], [0.4, 150, 166], [0.9, 150, 244], [1.9, 118, 210], [2.15, 120, 204], [2.65, 218, 162], [7.0, 218, 162], [7.6, 150, 166], [BD_LEN, 150, 166]] },
  ],
  pops: [
    { t0: 1.0, t1: 1.8, at: 0, text: 'Charge!' },
    { t0: 1.9, t1: 2.8, at: 5, text: 'One!' },
    { t0: 2.75, t1: 3.9, at: 7, text: 'Out' },
  ],
  labels: [
    { t0: 0, t1: 0.9, x: 10, y: 292, text: 'Runner on first, bunt coming' },
    { t0: 3.0, t1: 5.8, x: 10, y: 292, text: 'Sure out at first' },
  ],
}

export const DIAGRAMS = { 'rounding-first': roundingFirst, pickle, 'tee-work': teeWork, 'star-drill': starDrill, 'front-toss': frontToss, 'cutoffs-relays': cutoffs, 'backing-up': everybodyMoves, 'pitcher-covers-first': pitcherCoversFirst, 'bunt-defense': buntDefense }
