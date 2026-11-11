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
  ],
}

// Closing lines tied to what the practice worked on. Keyed by the needs they fit.
const FOCUS_CLOSERS = [
  {
    needs: ['throwing', 'catching'],
    young: ['Who can play catch with a grown-up before next practice? Two hands, eyes on the ball!'],
    older: ['Ten minutes of catch at home this week makes a real difference. See you next practice.'],
  },
  {
    needs: ['contact', 'approach', 'bunting'],
    young: ['Great swings today! Show someone at home your batting stance before next practice.'],
    older: ['Twenty good dry swings at home this week, nice and slow, and your swing will thank you.'],
  },
  {
    needs: ['grounders', 'flyballs'],
    young: ['You got in front of a lot of balls today. Ready position! Show me one more time.'],
    older: ['Roll yourself some grounders or throw a ball off a wall this week. Soft hands, every rep.'],
  },
  {
    needs: ['baserunning'],
    young: ['Fast feet today! Who remembers: run all the way through first base?'],
    older: ['Next game, run hard out of the box every time. Effort on the bases wins close games.'],
  },
  {
    needs: ['awareness'],
    young: ['Who can tell me where we throw the ball when nobody is on base?'],
    older: ['Before every pitch next game, know the outs and where the ball is going. Talk it out loud.'],
  },
  {
    needs: ['pitching', 'catcher'],
    young: ['Great work today. Who can show me their ready position one more time?'],
    older: ['Pitchers and catchers: rest your arm, then a little easy catch is all you need before next time.'],
  },
]

/**
 * A closing line for today's focus: one tied to the day's top needs when there is one, mixed with
 * the general lines so the same words do not close every practice.
 */
export function closerFor(band, focus = [], seed = '') {
  const top = focus.slice(0, 2)
  const tied = FOCUS_CLOSERS.filter((c) => c.needs.some((n) => top.includes(n))).flatMap((c) => c[band])
  return pick([...tied, ...tied, ...CLOSERS[band]], seed)
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
