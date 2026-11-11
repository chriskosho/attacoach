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

// Throwing, from the side, facing the target. Second arm (elbow2, hand2) is the glove arm.
const POWER = { head: [40, 13], neck: [40, 22], hip: [38, 50], k1: [27, 66], f1: [18, 86], k2: [51, 66], f2: [60, 86], elbow: [22, 24], hand: [13, 13], ball: [12, 10], elbow2: [54, 25], hand2: [67, 24], glove: [70, 26] }
const RELEASE = { head: [47, 14], neck: [45, 23], hip: [39, 50], k1: [29, 66], f1: [20, 84], k2: [54, 66], f2: [62, 86], elbow: [42, 14], hand: [52, 4], ball: [54, 2], elbow2: [54, 34], hand2: [48, 42], glove: [50, 42] }
const FINISH = { head: [57, 28], neck: [53, 35], hip: [41, 55], k1: [33, 66], f1: [22, 72], k2: [54, 68], f2: [61, 86], elbow: [60, 50], hand: [63, 66], elbow2: [47, 46], hand2: [42, 50], glove: [43, 50] }

POSE_SETS.throw = [
  // Sideways, glove pointing at the target, ball up and back.
  { n: 'Power position', j: POWER },
  // Front foot down, chest turning, elbow at shoulder height, glove pulled in to the chest.
  { n: 'Release', j: RELEASE },
  // Throwing hand finishes outside the front knee; back foot comes off the ground.
  { n: 'Finish', j: FINISH },
]
// The same three, in the words young players chant.
POSE_SETS.pointStep = [
  { n: 'Point', j: POWER },
  { n: 'Step', j: RELEASE },
  { n: 'Throw', j: FINISH },
]

// Bunting, from the front (the pitcher's view). Knees bent, bat at the top of the zone, top hand
// slid up behind the barrel (hand2), bottom hand near the body.
POSE_SETS.bunt = [
  { n: 'Bat at the top', j: { head: [40, 12], neck: [40, 22], hip: [40, 52], k1: [29, 67], f1: [22, 86], k2: [51, 67], f2: [58, 86], elbow: [30, 33], hand: [24, 28], tip: [76, 24], elbow2: [50, 33], hand2: [54, 26] } },
  // Low pitch: bend the knees to get down to it, keep the bat level.
  { n: 'Low pitch: bend knees', j: { head: [40, 24], neck: [40, 33], hip: [40, 60], k1: [26, 70], f1: [20, 86], k2: [54, 70], f2: [60, 86], elbow: [30, 45], hand: [24, 40], tip: [76, 36], elbow2: [50, 45], hand2: [54, 38] } },
]

// Catcher, from the side, facing the pitcher.
const CATCH_UP = { head: [38, 30], neck: [38, 39], hip: [30, 60], k1: [46, 62], f1: [36, 86], k2: [50, 64], f2: [42, 86], elbow: [52, 50], hand: [61, 47], glove: [64, 47] }
POSE_SETS.catcher = [
  // No runners: sit low and relaxed, throwing hand tucked behind the back.
  { n: 'No runners', j: { ...CATCH_UP, head: [37, 34], neck: [37, 43], hip: [28, 66], k1: [46, 64], k2: [50, 66], elbow: [50, 54], hand: [60, 52], glove: [63, 52], elbow2: [30, 52], hand2: [24, 60] } },
  // Runners on: hips up a little, weight forward, throwing hand behind the glove.
  { n: 'Runners on', j: { ...CATCH_UP, elbow2: [50, 52], hand2: [57, 49] } },
]
POSE_SETS.block = [
  { n: 'Runners on', j: { ...CATCH_UP, elbow2: [50, 52], hand2: [57, 49] } },
  // Drop to both knees, glove on the ground between them, chin tucked, shoulders forward.
  { n: 'Block', j: { head: [53, 40], neck: [49, 48], hip: [36, 66], k1: [42, 84], f1: [20, 86], k2: [48, 84], f2: [26, 86], elbow: [54, 66], hand: [56, 80], glove: [58, 83], elbow2: [50, 64], hand2: [53, 78] } },
]

// Pitching, from the side, facing home.
POSE_SETS.balance = [
  // Tall on the back leg, front knee up, hands together at the chest.
  { n: 'Balance point', j: { head: [34, 10], neck: [34, 19], hip: [34, 48], k1: [34, 66], f1: [33, 86], k2: [48, 40], f2: [44, 60], elbow: [42, 30], hand: [42, 36], glove: [44, 36] } },
  // Stride toward the target, throwing hand up as the front foot lands, glove out front.
  { n: 'Stride', j: { head: [39, 14], neck: [39, 23], hip: [38, 52], k1: [26, 68], f1: [18, 86], k2: [56, 66], f2: [64, 86], elbow: [22, 26], hand: [16, 13], ball: [15, 10], elbow2: [52, 26], hand2: [64, 25], glove: [67, 27] } },
  { n: 'Finish', j: FINISH },
]

// Fielding to the side, from the front (the hitter's view) for a right-handed fielder: the glove is
// on the viewer's right.
POSE_SETS.gloveSide = [
  // Forehand: low, leaning to the glove side, glove reaching out past the glove-side knee.
  { n: 'Forehand, from the front', j: { head: [50, 31], neck: [46, 40], hip: [34, 60], k1: [20, 72], f1: [10, 86], k2: [58, 72], f2: [70, 86], elbow: [60, 54], hand: [70, 70], glove: [73, 74], elbow2: [46, 54], hand2: [58, 64] } },
  // Backhand: leaning to the throwing side, glove across the body, out in front of the throwing-side foot.
  { n: 'Backhand, from the front', j: { head: [30, 31], neck: [34, 40], hip: [46, 60], k1: [22, 72], f1: [10, 86], k2: [60, 72], f2: [70, 86], elbow: [22, 54], hand: [12, 70], glove: [9, 74], elbow2: [36, 54], hand2: [26, 64] } },
]

// Ready position for the youngest: from the side, then from the front.
POSE_SETS.readyYoung = [
  { n: 'Ready, from the side', j: POSE_SETS.ready[0].j },
  { n: 'Ready, from the front', j: { head: [40, 26], neck: [40, 35], hip: [40, 56], k1: [24, 68], f1: [16, 86], k2: [56, 68], f2: [64, 86], elbow: [52, 54], hand: [50, 66], glove: [52, 68], elbow2: [28, 54], hand2: [30, 66] } },
]

// Drills with a pose set that has no moving diagram of its own.
export const POSES_FOR = {
  'funnel-grounders': 'ready',
  'throwing-progression': 'throw',
  'point-step-throw': 'pointStep',
  'bunting-basics': 'bunt',
  'catcher-stance': 'catcher',
  blocking: 'block',
  'balance-point': 'balance',
  'backhand-forehand': 'gloveSide',
  'ready-statues': 'readyYoung',
  'stance-load-go': 'swing',
  'dry-swings': 'swing',
}
