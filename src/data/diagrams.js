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

export const DIAGRAMS = { 'rounding-first': roundingFirst, pickle, 'tee-work': teeWork }
