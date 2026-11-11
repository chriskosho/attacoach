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
