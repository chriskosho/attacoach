import { SPORT } from './drillTags.js'

// One short YouTube search phrase for drills where a video helps. Written with the standard baseball
// term, not our own drill name, and each one was tested (the first ten results were checked by title).
// Drills with no good standard term, and simple ones, deliberately have none.

export const VIDEO_QUERY = {
  'rounding-first': 'rounding first base',
  pickle: 'youth baseball Pickle (rundown) drill',
  'tee-work': 'tee hitting drills youth baseball coach',
  'front-toss': 'front toss batting practice youth baseball',
  'funnel-grounders': 'youth baseball ground ball fielding drill basics',
  'drop-step': 'outfield drop step drill youth baseball',
  'towel-drill': 'youth baseball towel drill pitching',
  blocking: 'catcher blocking balls in the dirt drill youth',
  'bunting-basics': 'how to bunt baseball youth',
  'cutoffs-relays': 'cutoff and relay throws baseball youth',
  // Added with the drill pictures (each tested the same way, at least 6 of 10 on topic).
  'throwing-progression': 'youth baseball throwing progression drill',
  'long-toss': 'long toss program youth baseball',
  'backhand-forehand': 'how to field a backhand infield baseball',
  'slow-roller': 'how to field a slow roller baseball',
  'dp-feeds': 'double play feeds drill shortstop second base youth',
  'dp-turns': 'double play pivot footwork second base shortstop',
  'first-base-footwork': 'first base footwork drill youth baseball',
  'crow-hop-cutoff': 'outfield crow hop throw drill',
  'soft-toss': 'soft toss hitting drill youth baseball',
  'one-hand-tee': 'one hand hitting drill tee top hand bottom hand',
  'short-hops': 'short hop drill infield youth baseball',
  'catcher-stance': 'youth baseball catcher stance',
  'catcher-receiving': 'catcher receiving drills basics',
  'receiving-progression': 'catcher receiving drills basics',
  'catcher-throwdown': 'catcher throw to second base footwork drill',
  'balance-point': 'balance point pitching drill youth baseball',
  'pickoff-move': 'pickoff move to first base drill',
  'pitcher-covers-first': 'pitcher covering first base drill',
  'pfp-comebackers': 'PFP pitchers fielding practice drills',
  'leadoff-basics': 'how to take a lead off first base youth baseball',
  'secondary-lead': 'secondary lead baserunning drill',
  'steal-start': 'crossover step stealing second base drill',
  'tag-up': 'tagging up on a fly ball baserunning youth baseball',
  'bunt-defense': 'bunt coverage runner on first baseball defense',
  'first-and-third': 'first and third defense youth baseball',
}

// Softball phrases, written with the standard softball term. Each was tested the same way: a search
// limited to youtube.com, and kept only when at least 6 of the first 10 titles were on topic. A
// shared drill with no entry here has no video button for softball teams; a drill for one sport keeps
// that sport's phrase whoever opens it.
export const SOFTBALL_VIDEO = {
  // shared drills, the baseball phrase with "softball" swapped in
  'rounding-first': 'rounding first base softball',
  pickle: 'youth softball Pickle (rundown) drill',
  'tee-work': 'tee hitting drills youth softball coach',
  'front-toss': 'front toss batting practice youth softball',
  'funnel-grounders': 'youth softball ground ball fielding drill basics',
  'drop-step': 'outfield drop step drill youth softball',
  blocking: 'catcher blocking balls in the dirt drill youth softball',
  'bunting-basics': 'how to bunt softball youth',
  'cutoffs-relays': 'cutoff and relay throws softball youth',
  // softball drills
  'fp-grip-snaps': 'softball pitching wrist snaps drill',
  'fp-arm-circle': 'softball pitching arm circle drill',
  'fp-full-motion': 'fastpitch pitching mechanics for beginners',
  'fp-corners': 'softball pitching accuracy drills inside outside',
  'sb-leave-on-release': 'how to lead off a base in softball',
  'sb-bunt-and-run': 'softball sacrifice bunt drill',
  'sb-short-game': 'softball push bunt',
  'sb-slap-intro': 'softball slap hitting for beginners',
  'sb-corners-crash': 'softball bunt defense corners',
  // Added with the drill pictures. Slow roller, one-hand tee, receiving and first-and-third defense
  // were tested for softball and fell short, so softball teams get no button for those.
  'throwing-progression': 'youth softball throwing progression drill',
  'long-toss': 'long toss program softball',
  'backhand-forehand': 'how to field a backhand softball infield',
  'dp-feeds': 'softball double play feeds drill',
  'dp-turns': 'softball double play pivot footwork second base',
  'first-base-footwork': 'first base footwork drill softball',
  'crow-hop-cutoff': 'softball outfield crow hop throw drill',
  'soft-toss': 'soft toss hitting drill youth softball',
  'short-hops': 'short hop drill infield softball',
  'catcher-stance': 'youth softball catcher stance',
  'catcher-throwdown': 'softball catcher throw to second base footwork drill',
  'tag-up': 'tagging up on a fly ball baserunning softball',
  'bunt-defense': 'softball bunt coverage runner on first defense',
}

export function videoQuery(id, sport = 'baseball') {
  const only = SPORT[id]
  if (only === 'softball') return SOFTBALL_VIDEO[id] ?? null
  if (only === 'baseball' || sport !== 'softball') return VIDEO_QUERY[id] ?? null
  return SOFTBALL_VIDEO[id] ?? null
}

export const videoUrl = (id, sport = 'baseball') => {
  const q = videoQuery(id, sport)
  return q ? `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` : null
}
