// Moving diagrams for drills where space and movement are the point. Positions are drawn from above
// in a 300 x 300 box and are not to scale. The written steps come from the drill itself; `at` says
// when each step begins (seconds into the loop), so the picture and the text stay together.
//
// actor kinds: runner, fielder, kid, coach (a dot with a letter), ball, bat (attached to the first kid).
// track: [[time, x, y], ...]   (a bat's track is [[time, angleDegrees], ...])
// pops: speech bubbles above an actor.  labels: text shown only between two times.

const W = '#f6f6ee'
const kid = (track) => ({ kind: 'kid', fill: W, label: '', track })

// Three swings per hitter, with the coach re-teeing and giving one cue in between.
const swings = [2.0, 5.6, 9.2]
const bat = []
swings.forEach((s, k) => {
  const b = -360 * k
  bat.push([s, 150 + b], [s + 0.8, 175 + b], [s + 1.4, 60 + b], [s + 1.7, b], [s + 2.2, -70 + b], [s + 2.6, -110 + b], [s + 3.2, -210 + b])
})

export const DIAGRAMS = {
  'rounding-first': {
    len: 9,
    bg: 'field',
    extras: '<polygon points="211,194 218,208 204,208" class="dg-cone"/><text x="226" y="222" class="dg-lab">cone</text>',
    at: [1.2, 4.4, 5.6],
    actors: [
      { kind: 'ball', vis: [1.0, 9], track: [[0, 150, 250], [1.0, 150, 250], [3.2, 104, 128], [4.0, 96, 118], [9, 96, 118]] },
      { kind: 'runner', label: 'R', fill: '#f2c230', track: [[0, 146, 248], [1.2, 148, 246], [2.4, 176, 230], [3.2, 203, 218], [3.8, 222, 206], [4.4, 231, 188], [5.0, 228, 172], [5.9, 216, 152], [7.0, 204, 136], [9, 204, 136]] },
    ],
    trail: { actor: 1, from: 1.2, to: 7.0 },
    pops: [{ t0: 7.0, t1: 8.8, at: 1, text: 'Find the ball' }],
  },

  pickle: {
    len: 10,
    bg: 'field',
    at: [2.0, 4.4, 7.0],
    actors: [
      { kind: 'ball', track: [[0, 150, 92], [2.0, 150, 92], [3.6, 174, 112], [4.4, 178, 116], [5.8, 198, 138], [6.0, 198, 138], [6.6, 224, 163], [8.0, 201, 142], [8.4, 198, 139], [10, 198, 139]] },
      { kind: 'fielder', label: 'A', fill: W, track: [[0, 232, 172], [5.0, 232, 172], [6.6, 224, 163], [8.0, 201, 142], [8.4, 198, 139], [10, 198, 139]] },
      { kind: 'fielder', label: 'B', fill: W, track: [[0, 150, 92], [2.0, 150, 92], [3.6, 174, 112], [4.4, 178, 116], [5.8, 198, 138], [6.0, 198, 138], [7.4, 172, 112], [10, 172, 112]] },
      { kind: 'runner', label: 'R', fill: '#f2c230', track: [[0, 226, 166], [1.2, 205, 146], [2.0, 190, 131], [3.6, 205, 147], [4.6, 212, 153], [5.8, 214, 155], [6.0, 214, 155], [7.0, 203, 144], [8.2, 197, 138], [10, 197, 138]] },
    ],
    pops: [{ t0: 5.3, t1: 6.1, at: 1, text: 'NOW!' }, { t0: 8.3, t1: 9.8, at: 3, text: 'Out' }],
  },

  'tee-work': {
    len: 14,
    bg: 'cage',
    at: [0, 2.0, 4.4, 11.8],
    poses: 'swing',
    poseAt: [[0, 0], [2.6, 1], [3.4, 2], [4.0, 3], [4.6, 0], [6.2, 1], [7.0, 2], [7.6, 3], [8.2, 0], [9.8, 1], [10.6, 2], [11.2, 3], [11.9, 0]],
    actors: [
      { kind: 'ball', vis: [0, 4.3], track: [[0, 150, 172], [3.7, 150, 172], [4.2, 158, 50], [4.3, 158, 50]] },
      { kind: 'ball', vis: [5.0, 7.9], track: [[5.0, 150, 172], [7.3, 150, 172], [7.8, 158, 50], [7.9, 158, 50]] },
      { kind: 'ball', vis: [8.7, 11.5], track: [[8.7, 150, 172], [10.9, 150, 172], [11.4, 158, 50], [11.5, 158, 50]] },
      { kind: 'bat', vis: [0, 11.8], track: bat },
      kid([[0, 128, 172], [12.0, 128, 172], [13.8, 60, 252], [14, 60, 252]]),
      { kind: 'coach', label: 'C', fill: '#ff8a3d', track: [[0, 228, 172], [0.6, 228, 172], [1.2, 152, 190], [1.9, 152, 190], [2.4, 208, 158], [4.3, 208, 158], [4.9, 168, 156], [5.4, 168, 156], [5.9, 208, 158], [7.9, 208, 158], [8.5, 168, 156], [9.0, 168, 156], [9.5, 208, 158], [11.7, 208, 158], [12.4, 228, 172], [14, 228, 172]] },
      kid([[0, 104, 252], [12.0, 104, 252], [13.8, 128, 172], [14, 128, 172]]),
      kid([[0, 82, 252], [12.0, 82, 252], [13.8, 104, 252], [14, 104, 252]]),
      kid([[0, 60, 252], [12.0, 60, 252], [13.8, 82, 252], [14, 82, 252]]),
      kid([[0, 250, 122], [12.0, 250, 122], [12.8, 198, 58], [13.4, 198, 58], [14, 250, 122]]),
      kid([[0, 250, 92], [12.0, 250, 92], [12.8, 208, 56], [13.4, 208, 56], [14, 250, 92]]),
    ],
    pops: [
      { t0: 0.8, t1: 1.9, at: 5, text: 'Check stance' },
      { t0: 4.5, t1: 5.4, at: 5, text: 'Eyes on the ball' },
      { t0: 8.1, t1: 9.0, at: 5, text: 'Finish high' },
      { t0: 11.8, t1: 12.8, at: 5, text: 'Nice. Next hitter.' },
    ],
    labels: [
      { t0: 2.0, t1: 4.8, x: 14, y: 78, text: 'Swing 1' },
      { t0: 5.6, t1: 8.4, x: 14, y: 78, text: 'Swing 2' },
      { t0: 9.2, t1: 11.8, x: 14, y: 78, text: 'Swing 3' },
      { t0: 12.0, t1: 14.1, x: 14, y: 78, text: 'Next hitter' },
    ],
  },
}
