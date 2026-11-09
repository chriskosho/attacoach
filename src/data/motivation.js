// Original team talks for the start and end of practice, by age band.
// "young" fits 4U-8U, "older" fits 10U-14U.

export const OPENERS = {
  young: [
    'Today we are going to get a little bit better at {need}. Who\'s ready? Let me hear it!',
    'Big goal today: {need}. Try your hardest, and if you miss, try again. That\'s how we get good.',
    'Ballplayers listen, hustle and have fun. Today we practice {need}. Let\'s go!',
    'Every great player started right where you are. Today\'s job: {need}.',
    'Ready position! Today we\'re working on {need}, and I want to see big smiles and fast feet.',
  ],
  older: [
    'Today\'s focus is {need}. Pick one thing to do better than last time and own it.',
    'Games are won at practice. We\'re sharpening {need} today, every rep at game speed.',
    'Focus for today: {need}. Mistakes are fine. Not hustling is not.',
    'We get better together. Today it\'s {need}. Help your teammates and push yourself.',
    'Today we work on {need}. Be the player your teammates can count on.',
  ],
}

export const CLOSERS = {
  young: [
    'Great work today! Who can show me one thing they got better at?',
    'Bring it in! Name a teammate who did something great today.',
    'You worked hard. Go home and play catch with someone this week!',
    'Awesome practice. Hands in: "Team" on three!',
    'I saw a lot of hustle today. Who\'s proud of themselves? Me too!',
  ],
  older: [
    'Good practice. Tell me one thing you improved today and one thing you\'ll work on before next time.',
    'Shout out a teammate who made a great play or picked someone up today.',
    'Effort and attitude are the two things you control. You controlled them today.',
    'Next game, trust what we practiced. Be loud, be ready, be a good teammate.',
    'Ten minutes of catch at home this week makes a real difference. See you next practice.',
  ],
}

export const COACH_TIPS = [
  'Keep instructions to one sentence, then let them play. Kids learn by doing.',
  'Catch players doing something right and say it out loud.',
  'Short lines, lots of reps. If more than three kids are waiting, split the group.',
  'End on something fun so they want to come back.',
  'Name the goal before the drill and ask them about it after.',
  'Praise effort more than results. Effort is what they control.',
]

export const bandFor = (division) => (['4U', '6U', '8U'].includes(division) ? 'young' : 'older')

// Deterministic pick so a saved plan keeps the same message.
export function pick(list, seed) {
  let h = 0
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return list[h % list.length]
}
