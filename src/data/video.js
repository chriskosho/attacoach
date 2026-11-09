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

export const videoUrl = (id) => (VIDEO_QUERY[id] ? `https://www.youtube.com/results?search_query=${encodeURIComponent(VIDEO_QUERY[id])}` : null)
