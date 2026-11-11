import { SOFTBALL_TEXT } from './drillSoftball.js'

// Space, gear and staffing tags for the original drill library (see drillsMore.js for the meaning of
// each field). Kept apart from the drill write-ups so the tags are easy to scan and adjust.

const F = 'field'
const C = 'cage'
const O = 'open'
const G = 'gym'

export const TAGS = {
  // warm-ups
  'dynamic-warmup': { where: [F, O, G], staff: 'run' },
  'animal-walks': { where: [F, O, G], staff: 'run' },
  'coach-says': { where: [F, O, G], staff: 'run' },
  'arm-care': { where: [F, O, G, C], staff: 'run' },
  'bases-warmup': { where: [F], staff: 'run' },
  'footwork-ladder': { where: [F, O, G, C], staff: 'kids', cap: [2, 6], swap: 'No ladder? Use chalk lines or cones.' },
  'reaction-ball': { where: [F, O, G], staff: 'watch', cap: [2, 6] },
  // throwing
  'throwing-progression': { where: [F, O], staff: 'run' },
  'tennis-ball-catch': { where: [F, O, G], staff: 'watch', cap: [2, 8] },
  alligator: { where: [F, O, G], staff: 'watch', cap: [2, 6] },
  'target-throw': { where: [F, O, G], staff: 'watch', cap: [2, 8] },
  'star-drill': { where: [F, O], staff: 'run', cap: [4, 6] },
  'quick-hands': { where: [F, O, G, C], staff: 'kids', cap: [2, 12] },
  'catch-21': { where: [F, O], staff: 'run' },
  'long-toss': { where: [F, O], staff: 'run' },
  // infield
  'ready-statues': { where: [F, O, G], staff: 'run' },
  'funnel-grounders': { where: [F, O, G], staff: 'run', cap: [3, 6] },
  'short-hops': { where: [F, O, G, C], staff: 'kids', cap: [2, 12] },
  'field-throw-first': { where: [F], staff: 'run', cap: [3, 6] },
  'backhand-forehand': { where: [F, O], staff: 'run', cap: [3, 6] },
  'slow-roller': { where: [F], staff: 'run', cap: [3, 5] },
  'dp-feeds': { where: [F], staff: 'run', cap: [3, 6] },
  'first-base-footwork': { where: [F], staff: 'run', cap: [3, 5] },
  'tag-plays': { where: [F], staff: 'run', cap: [3, 6] },
  // outfield
  'drop-step': { where: [F, O], staff: 'run', cap: [3, 6] },
  'tennis-flies': { where: [F, O, G], staff: 'run', cap: [3, 8] },
  'flyball-communication': { where: [F, O], staff: 'run', cap: [3, 6] },
  'crow-hop-cutoff': { where: [F, O], staff: 'run', cap: [3, 6] },
  'outfield-grounders': { where: [F, O], staff: 'run', cap: [3, 6] },
  // hitting
  'tee-work': { where: [F, C, O], gear: ['tee'], swap: 'No tee? Use soft toss or a self-run hitting trainer.', staff: 'run', cap: [2, 6], bat: true },
  'soft-toss': { where: [F, C, O], staff: 'run', cap: [2, 5], bat: true },
  'front-toss': { where: [F, C], gear: ['lscreen'], swap: 'No L-screen? Toss from the side, well out of the hitting line.', staff: 'run', cap: [3, 6], bat: true },
  'line-drive-target': { where: [F, C, O], gear: ['tee'], swap: 'No tee? Use soft toss.', staff: 'watch', cap: [2, 6], bat: true },
  'stance-load-go': { where: [F, O, G], staff: 'run', bat: true },
  'two-strike': { where: [F, C], gear: ['lscreen'], swap: 'No L-screen? Use the pitching machine or soft toss.', staff: 'run', cap: [3, 5], bat: true },
  'ball-or-strike': { where: [F, C], gear: ['lscreen'], swap: 'No L-screen? Toss from behind a fence or net.', staff: 'run', cap: [3, 6], bat: true },
  'bunting-basics': { where: [F, C], staff: 'run', cap: [3, 6], bat: true },
  'bunt-placement': { where: [F], staff: 'run', cap: [3, 6], bat: true },
  'live-bp': { where: [F, C], staff: 'run', bat: true },
  'coach-pitch-bp': { where: [F], staff: 'run', bat: true },
  'hit-and-run-first': { where: [F], gear: ['tee'], swap: 'No tee? Coach tosses.', staff: 'run', cap: [3, 6], bat: true },
  // base running
  'run-through-first': { where: [F], staff: 'watch', cap: [3, 8] },
  'rounding-first': { where: [F], staff: 'run', cap: [3, 8] },
  'leadoff-basics': { where: [F], staff: 'run', cap: [3, 6] },
  'steal-start': { where: [F, O], staff: 'run', cap: [3, 6] },
  'tag-up': { where: [F], staff: 'run', cap: [3, 6] },
  'dropped-third-run': { where: [F], staff: 'run', cap: [3, 6] },
  'base-relay': { where: [F], staff: 'run' },
  'ball-in-dirt': { where: [F], staff: 'run', cap: [3, 6] },
  // pitching
  'balance-point': { where: [F, O, G, C], gear: ['net'], swap: 'No net? Throw to a partner.', staff: 'watch', cap: [2, 6] },
  'towel-drill': { where: [F, O, G, C], staff: 'kids', cap: [2, 8] },
  'bullpen-targets': { where: [F, C], gear: ['catcherGear'], swap: 'No catcher gear? Throw to a net or strike target.', staff: 'run', cap: [2, 4] },
  'pickoff-move': { where: [F], staff: 'run', cap: [2, 5] },
  'pitcher-covers-first': { where: [F], staff: 'run', cap: [3, 6] },
  // catcher
  'catcher-stance': { where: [F, O, G, C], gear: ['catcherGear'], swap: 'No catcher gear? Practice the stance without it.', staff: 'watch', cap: [2, 5] },
  blocking: { where: [F, O, G, C], gear: ['catcherGear'], swap: 'No catcher gear? Use soft balls only.', staff: 'run', cap: [2, 4] },
  'catcher-throwdown': { where: [F], gear: ['catcherGear'], swap: 'No catcher gear? Work footwork and throws without a hitter, and keep it half speed.', staff: 'run', cap: [2, 4] },
  'dropped-third-catcher': { where: [F], gear: ['catcherGear'], swap: 'No catcher gear? Use soft balls rolled to the catcher.', staff: 'run', cap: [2, 4] },
  // team
  situations: { where: [F], staff: 'run' },
  'cutoffs-relays': { where: [F], staff: 'run' },
  'backing-up': { where: [F], staff: 'run' },
  'force-or-tag': { where: [F], staff: 'run' },
  'bunt-defense': { where: [F], staff: 'run' },
  'first-and-third': { where: [F], staff: 'run' },
  // games
  pickle: { where: [F, O], staff: 'run', cap: [3, 6] },
  'flyball-500': { where: [F, O], staff: 'run', cap: [3, 8] },
  'knockout-grounders': { where: [F, O, G], staff: 'run', cap: [3, 8] },
  'clean-the-yard': { where: [F, O, G], staff: 'run' },
  scrimmage: { where: [F], staff: 'run' },
  'hit-all-fields': { where: [F], gear: ['tee'], swap: 'No tee? Use front toss.', staff: 'run', cap: [3, 6], bat: true },

  // ---------------------------------------------------------------- Young teams and closing games (drillsYoung.js)
  // warm-ups
  'follow-the-leader': { where: [F, O, G], staff: 'run', cap: [4, 14] },
  'sharks-minnows': { where: [F, O, G], gear: ['cones'], swap: 'No cones? Use gloves or hats to mark the box.', staff: 'run', cap: [4, 14] },
  // throwing and catching
  'point-step-throw': { where: [F, O, G], staff: 'run', cap: [2, 6] },
  'bounce-catch': { where: [F, O, G], staff: 'run', cap: [2, 6] },
  // ground balls
  'goalie-grounders': { where: [F, O, G], gear: ['cones'], swap: 'No cones? Two gloves on the ground make the goal.', staff: 'run', cap: [2, 4] },
  'field-and-run': { where: [F, O, G], staff: 'run', cap: [2, 5] },
  // balls in the air
  'self-toss-catch': { where: [F, O, G], staff: 'run', cap: [2, 12] },
  'rainbow-catch': { where: [F, O, G], staff: 'run', cap: [2, 6] },
  // hitting
  'wiffle-tee': { where: [F, O, C, G], gear: ['tee'], swap: 'No tee? Set the ball on a tall cone.', staff: 'run', cap: [2, 4], bat: true },
  'swing-and-freeze': { where: [F, O, C, G], gear: ['tee'], swap: 'No tee? Set the ball on a tall cone.', staff: 'run', cap: [2, 4], bat: true },
  // base running
  'red-light-bases': { where: [F, O], staff: 'run', cap: [4, 14] },
  'run-to-the-base': { where: [F, O], staff: 'run', cap: [4, 14] },
  // closing games
  'beat-the-ball': { where: [F, O], gear: ['tee'], swap: 'No tee? A coach tosses soft pitches.', staff: 'run', cap: [6, 14], bat: true },
  'fill-the-bucket': { where: [F, O, G], staff: 'run', cap: [6, 14] },
  'toss-500': { where: [F, O], staff: 'run', cap: [6, 14] },
  workup: { where: [F], staff: 'run', cap: [7, 14], bat: true },
  'around-the-horn': { where: [F, O], staff: 'watch', cap: [4, 12] },
  pepper: { where: [F, O], staff: 'watch', cap: [4, 12], bat: true },
  'relay-race': { where: [F, O], staff: 'run', cap: [6, 14] },

  // ---------------------------------------------------------------- 10U to 14U (drillsOlder.js)
  'bullpen-intent': { where: [F, C], gear: ['catcherGear'], swap: 'No catcher gear? Pitch to a net or strike target.', staff: 'run', cap: [2, 4] },
  'bullpen-plan': { where: [F, C], gear: ['catcherGear'], swap: 'No catcher gear? Pitch to a net or strike target and chart the same way.', staff: 'run', cap: [2, 4] },
  'pfp-comebackers': { where: [F], staff: 'run', cap: [4, 6] },
  'pitcher-covers-home': { where: [F], gear: ['catcherGear'], swap: 'No catcher gear? Run it with the coach as the catcher, no pitches thrown.', staff: 'run', cap: [3, 5] },
  'time-to-plate': { where: [F], gear: ['catcherGear'], swap: 'No catcher gear? Pitch to a net and time to the net.', staff: 'run', cap: [3, 5] },
  'receiving-progression': { where: [F, C, G, O], gear: ['catcherGear'], swap: 'No catcher gear? Stay with tennis balls and tosses, and wear a mask if you have one.', staff: 'watch', cap: [2, 4] },
  'catcher-pop-ups': { where: [F], gear: ['catcherGear'], swap: 'No catcher gear? A helmet and soft balls, so the mask toss is pretend.', staff: 'run', cap: [2, 4] },
  'catcher-throws-bases': { where: [F], gear: ['catcherGear'], swap: 'No catcher gear? Coach hands the ball in and the catcher works footwork and throws only.', staff: 'run', cap: [3, 5] },
  'dp-turns': { where: [F], staff: 'run', cap: [4, 6] },
  'relay-footwork': { where: [F, O], staff: 'watch', cap: [3, 9] },
  'pop-up-priority': { where: [F], staff: 'run', cap: [6, 14] },
  'cutoff-to-base': { where: [F], staff: 'run', cap: [7, 14] },
  'fence-and-gaps': { where: [F], staff: 'run', cap: [3, 6] },
  'oppo-rounds': { where: [F, C], gear: ['lscreen'], swap: 'No L-screen? Use a tee set on the outer half.', staff: 'run', cap: [3, 5], bat: true },
  'live-at-bats': { where: [F], gear: ['catcherGear'], swap: 'No catcher gear? Coach pitches and nobody catches; a fence or net stops the ball.', staff: 'run', cap: [8, 14], bat: true },
  'move-the-runner': { where: [F], gear: ['lscreen'], swap: 'No L-screen? Use a pitching machine, or soft toss from the side and play it out.', staff: 'run', cap: [7, 14], bat: true },
  'first-to-third': { where: [F], staff: 'run', cap: [4, 8] },
  'secondary-lead': { where: [F], staff: 'run', cap: [4, 8] },
  'dirt-read-third': { where: [F], gear: ['catcherGear'], swap: 'No catcher gear? Coach rolls balls past or in front of a cone at home.', staff: 'run', cap: [3, 6] },
  'rundown-team': { where: [F], staff: 'run', cap: [6, 12] },
  // ---------------------------------------------------------------- Softball (drillsSoftball.js)
  // fastpitch pitching
  'fp-grip-snaps': { where: [F, O, G], staff: 'watch', cap: [2, 6] },
  'fp-k-drill': { where: [F, O, G], staff: 'watch', cap: [2, 6] },
  'fp-arm-circle': { where: [F, O, G], staff: 'watch', cap: [2, 6] },
  'fp-walk-through': { where: [F, O, C], gear: ['net'], swap: 'No net? Pitch to a catcher or a partner with a glove.', staff: 'watch', cap: [2, 4] },
  'fp-full-motion': { where: [F, C], gear: ['catcherGear'], swap: 'No catcher gear? Pitch to a net or strike target.', staff: 'run', cap: [2, 4] },
  'fp-corners': { where: [F, C], gear: ['catcherGear'], swap: 'No catcher gear? Pitch to a net with tape marking the inside and outside.', staff: 'run', cap: [2, 4] },
  'fp-sim-inning': { where: [F, C], gear: ['catcherGear'], swap: 'No catcher gear? Pitch to a net or strike target and keep the count out loud.', staff: 'run', cap: [2, 4] },
  'fp-coach-eye': { where: [F, O, C], staff: 'run', cap: [1, 3] },
  'fp-pitcher-fields': { where: [F], staff: 'run', cap: [4, 6] },
  // softball base running
  'sb-leave-on-release': { where: [F], staff: 'run', cap: [4, 9] },
  'sb-read-first-second': { where: [F], staff: 'run', cap: [4, 10] },
  'sb-read-third': { where: [F], staff: 'run', cap: [4, 8] },
  // short game
  'sb-bunt-and-run': { where: [F], staff: 'run', cap: [3, 6], bat: true },
  'sb-short-game': { where: [F, C], gear: ['lscreen'], swap: 'No L-screen? Toss from the side, well out of the bunting line.', staff: 'run', cap: [3, 6], bat: true },
  'sb-slap-intro': { where: [F, C, O], staff: 'run', cap: [2, 5], bat: true },
  // softball defense
  'sb-corners-crash': { where: [F], staff: 'run', cap: [4, 6] },
  'sb-defend-slap': { where: [F], staff: 'run', cap: [5, 8] },
  // coach pitch
  'cp-quick-rhythm': { where: [F], gear: ['lscreen'], swap: 'No screen? After each pitch, turn your glove side to the hitter, and wear a fielder\'s mask if you have one.', staff: 'run', cap: [3, 8], bat: true },
  'cp-timing': { where: [F, C, O], gear: ['net'], swap: 'No net? Hit into a fence.', staff: 'run', cap: [2, 4], bat: true },
  'cp-coach-grounders': { where: [F, O], staff: 'run', cap: [3, 7] },
  'cp-pitcher-spot': { where: [F], staff: 'run', cap: [3, 6] },
  // tee ball
  'tb-at-bat': { where: [F, O], gear: ['tee'], swap: 'No tee? Set the ball on a tall cone.', staff: 'run', cap: [3, 9], bat: true },
  'tb-stay-or-go': { where: [F, O], staff: 'run', cap: [4, 12] },
  'tb-big-target': { where: [F, O, G], staff: 'run', cap: [2, 4] },
}

// Drills for one sport only. Absent means both. Baseball-only drills teach baseball mechanics:
// overhand pitching from a leg lift, pickoff moves, and leading off before the pitch.
export const SPORT = {
  'balance-point': 'baseball', // leg lift to a balance point: overhand pitching
  'towel-drill': 'baseball', // overhand pitching motion and stride
  'net-targets': 'baseball', // pitching from the stretch with a leg lift
  'pickoff-move': 'baseball', // pickoffs, the set position and balks
  'leadoff-basics': 'baseball', // leading off before the pitch
  'steal-start': 'baseball', // crossover start from a lead
  'ball-in-dirt': 'baseball', // secondary lead off first as the pitch comes
  'pitcher-covers-first': 'baseball', // pitcher off the mound covering first: softball coverage differs
  'bullpen-intent': 'baseball', // windup and stretch
  'bullpen-plan': 'baseball', // windup, stretch and mound
  'pfp-comebackers': 'baseball', // pitchers fielding off the mound (softball: fp-pitcher-fields)
  'pitcher-covers-home': 'baseball', // pitcher off the mound covering home
  'time-to-plate': 'baseball', // leg lift, the set position and balks
  'secondary-lead': 'baseball', // secondary leads
  'dirt-read-third': 'baseball', // leading off third
  // Softball only: every drill in drillsSoftball.js.
  'fp-grip-snaps': 'softball',
  'fp-k-drill': 'softball',
  'fp-arm-circle': 'softball',
  'fp-walk-through': 'softball',
  'fp-full-motion': 'softball',
  'fp-corners': 'softball',
  'fp-sim-inning': 'softball',
  'fp-coach-eye': 'softball',
  'fp-pitcher-fields': 'softball',
  'sb-leave-on-release': 'softball',
  'sb-read-first-second': 'softball',
  'sb-read-third': 'softball',
  'sb-bunt-and-run': 'softball',
  'sb-short-game': 'softball',
  'sb-slap-intro': 'softball',
  'sb-corners-crash': 'softball',
  'sb-defend-slap': 'softball',
  'cp-quick-rhythm': 'softball',
  'cp-timing': 'softball',
  'cp-coach-grounders': 'softball',
  'cp-pitcher-spot': 'softball',
  'tb-at-bat': 'softball',
  'tb-stay-or-go': 'softball',
  'tb-big-target': 'softball',
}

// Softball drills for some formats only. Absent means every format. Windmill pitching and the short
// game are for fastpitch; coach-pitch and tee-ball drills are for those formats.
const FP = ['fastpitch']
export const FORMAT = {
  'fp-grip-snaps': FP,
  'fp-k-drill': FP,
  'fp-arm-circle': FP,
  'fp-walk-through': FP,
  'fp-full-motion': FP,
  'fp-corners': FP,
  'fp-sim-inning': FP,
  'fp-coach-eye': FP,
  'fp-pitcher-fields': FP,
  'sb-bunt-and-run': FP, // many coach-pitch leagues don't allow bunting
  'sb-short-game': FP,
  'sb-slap-intro': FP,
  'sb-corners-crash': FP,
  'sb-defend-slap': FP,
  'cp-quick-rhythm': ['coach-pitch'],
  'cp-timing': ['coach-pitch'],
  'cp-coach-grounders': ['coach-pitch'],
  'cp-pitcher-spot': ['coach-pitch'],
  'tb-at-bat': ['tee-ball'],
  'tb-stay-or-go': ['tee-ball'],
  'tb-big-target': ['tee-ball'],
}

// Fills in defaults so every drill has the same shape, plus its sport, formats and softball wording.
export function withTags(d) {
  const t = TAGS[d.id] ?? {}
  const sport = SPORT[d.id]
  const softball = SOFTBALL_TEXT[d.id]
  const formats = FORMAT[d.id]
  return {
    where: ['field'],
    gear: [],
    staff: 'run',
    cap: [2, 6],
    bat: false,
    athletic: false,
    ...t,
    ...d,
    ...(sport ? { sport } : {}),
    ...(formats ? { formats } : {}),
    ...(softball ? { softball } : {}),
  }
}
