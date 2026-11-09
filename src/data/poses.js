// Key body positions, drawn as stick figures from the side in an 80 x 92 box, facing right (toward
// the pitcher or the ball). Used where a wrong picture in a coach's head leads to a bad habit.
// Joints: head, neck, hip, k1/f1 (back knee and foot), k2/f2 (front), elbow, hand, then a bat tip,
// a glove or a ball.

export const POSE_SETS = {
  swing: [
    // Feet wider than shoulders, knees soft, hands by the back shoulder, bat up.
    { n: 'Stance', j: { head: [36, 12], neck: [36, 21], hip: [36, 48], k1: [30, 66], f1: [25, 86], k2: [43, 66], f2: [49, 86], elbow: [26, 32], hand: [30, 21], tip: [24, 1] } },
    // Weight back, hands go back a little, small soft step.
    { n: 'Load', j: { head: [34, 13], neck: [34, 22], hip: [33, 48], k1: [28, 66], f1: [25, 86], k2: [43, 64], f2: [51, 84], elbow: [22, 32], hand: [25, 22], tip: [14, 4] } },
    // Front leg firm, back knee drives, head still and behind the ball, hands out front.
    { n: 'Contact', j: { head: [37, 14], neck: [38, 23], hip: [38, 48], k1: [33, 67], f1: [26, 84], k2: [46, 66], f2: [53, 86], elbow: [44, 38], hand: [50, 44], tip: [72, 42], ball: [75, 42] } },
    // Chest to the pitcher, back foot on its toe, hands finish high over the front shoulder.
    { n: 'Finish', j: { head: [38, 12], neck: [39, 21], hip: [40, 48], k1: [38, 68], f1: [32, 84], k2: [47, 66], f2: [53, 86], elbow: [54, 24], hand: [50, 9], tip: [24, 18] } },
  ],
  ready: [
    // Wide feet, knees bent, butt down, glove out in front.
    { n: 'Ready', j: { head: [44, 28], neck: [41, 35], hip: [28, 54], k1: [38, 68], f1: [30, 86], k2: [50, 66], f2: [50, 86], elbow: [50, 48], hand: [57, 58], glove: [60, 61] } },
    // Low, glove down out in front of the eyes, not between the feet.
    { n: 'Field it out front', j: { head: [53, 40], neck: [48, 46], hip: [26, 62], k1: [37, 73], f1: [27, 86], k2: [50, 72], f2: [52, 86], elbow: [58, 64], hand: [64, 79], glove: [67, 81], ball: [70, 80] } },
    // Hands come up to the belly button.
    { n: 'Funnel to belly', j: { head: [47, 32], neck: [44, 40], hip: [27, 60], k1: [37, 71], f1: [27, 86], k2: [49, 70], f2: [51, 86], elbow: [52, 56], hand: [43, 55], glove: [45, 55], ball: [45, 55] } },
  ],
}

// Drills with a pose set that has no moving diagram of its own.
export const POSES_FOR = { 'funnel-grounders': 'ready' }
