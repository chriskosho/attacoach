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
  alligator: { where: [F, O, G], staff: 'watch', cap: [2, 8] },
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
}

// Fills in defaults so every drill has the same shape, plus its sport and softball wording.
export function withTags(d) {
  const t = TAGS[d.id] ?? {}
  const sport = SPORT[d.id]
  const softball = SOFTBALL_TEXT[d.id]
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
    ...(softball ? { softball } : {}),
  }
}
