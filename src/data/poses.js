// Key body positions, drawn as stick figures in an 80 x 92 box (facing right). Used where a wrong
// picture in a coach's head leads to a bad habit: a stance, a swing, a ready position.
// j = joints: head, neck, hip, k1/f1 (back knee and foot), k2/f2 (front), hand, and a bat tip or glove.

export const POSE_SETS = {
  swing: [
    { n: 'Stance', j: { head: [34, 12], neck: [34, 21], hip: [34, 46], k1: [30, 64], f1: [27, 86], k2: [38, 64], f2: [42, 86], hand: [42, 32], tip: [52, 10] } },
    { n: 'Load', j: { head: [30, 13], neck: [31, 22], hip: [30, 47], k1: [26, 65], f1: [23, 86], k2: [36, 63], f2: [41, 83], hand: [24, 30], tip: [34, 6] } },
    { n: 'Contact', j: { head: [38, 14], neck: [38, 23], hip: [34, 47], k1: [27, 66], f1: [24, 86], k2: [42, 65], f2: [50, 86], hand: [54, 32], tip: [76, 30] } },
    { n: 'Finish', j: { head: [36, 13], neck: [37, 22], hip: [32, 47], k1: [27, 66], f1: [24, 86], k2: [42, 66], f2: [50, 86], hand: [26, 18], tip: [8, 26] } },
  ],
  ready: [
    { n: 'Ready', j: { head: [40, 26], neck: [38, 34], hip: [26, 56], k1: [38, 68], f1: [34, 86], k2: [46, 68], f2: [52, 86], hand: [56, 52], glove: [60, 56] } },
    { n: 'Field it out front', j: { head: [46, 30], neck: [44, 38], hip: [28, 58], k1: [42, 70], f1: [38, 86], k2: [50, 70], f2: [56, 86], hand: [64, 66], glove: [68, 72] } },
    { n: 'Funnel to belly', j: { head: [44, 32], neck: [42, 40], hip: [28, 60], k1: [40, 70], f1: [36, 86], k2: [48, 70], f2: [54, 86], hand: [46, 56], glove: [48, 58] } },
  ],
}

// Drills with a pose set that has no moving diagram of its own.
export const POSES_FOR = { 'tee-work': 'swing', 'funnel-grounders': 'ready' }
