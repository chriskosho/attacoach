// Coach the Coach: what to say, what to skip, and how to run a team with confidence.
// Short bullets on purpose. Coaches should say these in their own words.
// Bands: "young" is 4U-8U, "older" is 10U-14U (see bandFor in motivation.js).

// ---------------------------------------------------------------- Huddles

export const HUDDLES = {
  practiceOpen: {
    title: 'Practice opener',
    when: 'First 2 minutes, before the warm-up',
    young: [
      'Say hi to everyone by name. Kids work harder for a coach who knows them.',
      'One goal for today, in a few words: "Today we get better at {focus}."',
      'The rules: listen when the coach talks, hustle between drills, cheer for teammates.',
      'Get them moving fast. Little kids listen best for about 30 seconds.',
    ],
    older: [
      'Today’s focus and why it matters: "{focus}. It showed up in our last game."',
      'One thing you want to see from everyone, like "talk on every ball".',
      'Effort and attitude are the two things they control. Say you are watching for both.',
      'Keep it under 2 minutes, then go.',
    ],
  },
  practiceClose: {
    title: 'Practice wrap-up',
    when: 'Last 3 to 5 minutes',
    young: [
      'Ask: "Who got better at something today?" Let a few kids answer.',
      'Name a few kids for effort, and spread it around over the season.',
      'One thing to try at home, like playing catch with a grown-up.',
      'Finish with a team cheer. Leave them smiling.',
    ],
    older: [
      'Ask each player for one thing they improved and one to work on.',
      'Give shout-outs for effort and for picking up a teammate, not just results.',
      'Give the plan for next time: the next practice or game, and what to be ready for.',
      'Keep it positive and short. Save corrections for one-on-one.',
    ],
  },
  preGame: {
    title: 'Pre-game huddle',
    when: 'After warm-ups, before first pitch',
    young: [
      'Have fun, run hard, cheer for each other. That is the whole game plan.',
      'Remind them where to run after they hit: "First base, run through it!"',
      'Ready position on every pitch: "Glove down, eyes on the batter."',
      'Big team cheer to break the huddle.',
    ],
    older: [
      'Two or three keys from practice, like "talk on fly balls" or "two-strike approach".',
      'Control what you can control: effort, attitude, being a good teammate.',
      'Mistakes will happen. Next pitch, next play. We pick each other up.',
      'Know the situation before every pitch: outs, runners, where the ball goes.',
    ],
  },
  postGameWin: {
    title: 'After a win',
    when: 'Right after the game, before the parents grab them',
    young: [
      'Tell them you are proud of how hard they played.',
      'Name a few great moments, including effort plays, not just hits.',
      'Thank the other team and the umpires. Good sports win twice.',
      'Snack and a cheer. Keep it short.',
    ],
    older: [
      'Celebrate the effort and the things that won the game, like a great defensive play.',
      'Point out one thing to keep working on. Winning teams still get better.',
      'Shout out a teammate who did the small things, like a bunt, a backup or a good at-bat.',
      'Stay humble. Good sports win twice.',
    ],
  },
  postGameLoss: {
    title: 'After a loss',
    when: 'Right after the game. Calm voice, short talk.',
    young: [
      'Tell them you are proud of how hard they played. They hear the scoreboard less than you think.',
      'Name a few great moments from the game.',
      'Next practice, we work on making those plays even better.',
      'End with a cheer. Kids should leave feeling like a team.',
    ],
    older: [
      'Stay calm and short. Big lessons land better at the next practice.',
      'Find the good things: effort, a great play, players picking each other up.',
      'Name one or two things to work on, as a team, without singling anyone out.',
      'We learn from it, then let it go. Next game is a new game.',
    ],
  },
}

export const fillFocus = (text, focus) => text.replace('{focus}', focus)

// ---------------------------------------------------------------- Say this, not that (by drill type)

export const CUES = {
  warmup: [
    { say: 'Show me your best form, then speed.', not: 'Hurry up.', why: 'Good form now prevents injuries and builds habits.' },
    { say: 'Everybody together, count it out loud.', not: 'Stop goofing around.', why: 'Giving them a job fixes focus faster than scolding.' },
  ],
  throwing: [
    { say: 'Point your glove at the target, then throw through it.', not: 'Just throw it straight.', why: 'Give one thing to do, not the result you want.' },
    { say: 'Catch it with two hands, then get your feet set.', not: 'Don’t drop it.', why: 'Kids hear the word "drop" and picture dropping.' },
    { say: 'Nice throw. Let’s see that again.', not: 'Finally!', why: 'Praise the good rep without making the miss the story.' },
  ],
  infield: [
    { say: 'Glove down early, watch it all the way in.', not: 'Get in front of it!', why: 'Specific body cues work better than general orders.' },
    { say: 'Great hustle to it. Next one’s yours.', not: 'That was an easy one.', why: 'Nothing is easy to a kid who just missed it.' },
    { say: 'Set your feet, then make a firm throw.', not: 'Hurry, hurry!', why: 'Rushed throws cause errors. Calm feet make good throws.' },
  ],
  outfield: [
    { say: 'Call it loud: "I got it!" Then go get it.', not: 'Somebody catch it!', why: 'Teaches who takes charge on the play.' },
    { say: 'First step back, then come in if you need to.', not: 'You misjudged it.', why: 'Gives a fix they can use on the next ball.' },
  ],
  hitting: [
    { say: 'See the ball, swing hard, finish tall.', not: 'Just hit the ball.', why: 'If it were that simple, they would. Give them one focus.' },
    { say: 'Breathe out in the box. Your swing is ready.', not: 'Don’t strike out.', why: 'Kids picture what you say. Say what you want.' },
    { say: 'Good swing on a strike. That is a win.', not: 'Why did you swing at that?', why: 'Praise the decision and the effort, not only the result.' },
  ],
  baserunning: [
    { say: 'Run hard through the bag, eyes on your coach.', not: 'Don’t get out.', why: 'Tells them exactly what to do.' },
    { say: 'Great read. Trust your eyes next time too.', not: 'What were you doing?', why: 'Ask what they saw instead. Base running is learned by reading.' },
  ],
  pitching: [
    { say: 'Pick a spot on the glove, breathe out, throw to it.', not: 'Just throw strikes.', why: 'A target and a breath calm the nerves. Pressure adds to them.' },
    { say: 'Next pitch. That one is gone.', not: 'Come on, throw a strike!', why: 'One pitch at a time keeps a pitcher in control.' },
    { say: 'Good tempo. Same thing again.', not: 'You’re walking everybody.', why: 'Pitchers already know. Give them something to do.' },
  ],
  catcher: [
    { say: 'Quiet glove, stick it for a second.', not: 'Hold on to it!', why: 'Gives a technique, not a demand.' },
    { say: 'Great block. That saves runs.', not: 'You let that one by.', why: 'Catchers take a beating. Celebrate the hard plays.' },
  ],
  team: [
    { say: 'Where are you going if the ball comes to you?', not: 'Think!', why: 'Questions teach game sense. Commands don’t.' },
    { say: 'Talk to each other. Loud teams make fewer mistakes.', not: 'Pay attention.', why: 'Gives them a way to pay attention.' },
  ],
  game: [
    { say: 'Have fun, compete, and cheer the good plays on both teams.', not: 'You have to win this.', why: 'Competition is fun when the pressure is right-sized.' },
    { say: 'Nice try. Let’s get the next one.', not: 'You’re out, sit down.', why: 'Keep kids playing and keep the mood up.' },
  ],
}

// One or two cues for a drill, picked by its id so the same drill always shows the same advice.
export function cuesFor(drill, count = 1) {
  const list = CUES[drill?.category] ?? []
  if (!list.length) return []
  let h = 0
  for (const ch of drill.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return Array.from({ length: Math.min(count, list.length) }, (_, i) => list[(h + i) % list.length])
}

// ---------------------------------------------------------------- Tough moments

export const MOMENTS = [
  {
    id: 'strikeout',
    title: 'After a strikeout',
    say: ['Shake it off. You’ll get the next one.', 'Good swing on that pitch. Keep swinging.', 'What did you see? Next time, look for one you like.'],
    not: ['What were you looking at?', 'You have to swing at that!'],
    why: 'They already feel it. Keep them wanting to swing next time.',
  },
  {
    id: 'error',
    title: 'After an error in the field',
    say: ['Next play. I want it hit to you again.', 'Great effort to get there. Glove down on the next one.'],
    not: ['That was an easy one.', 'Come on, you have to make that play.'],
    why: 'The next ball is coming. A kid who wants the ball plays better than one who hopes it goes elsewhere.',
  },
  {
    id: 'walks',
    title: 'When a pitcher is struggling',
    say: ['Breathe. Pick your spot. Throw it there.', 'You’re fine. One pitch at a time.'],
    not: ['Just throw strikes!', 'You’re walking everybody.'],
    why: 'Nerves shrink with a simple job and a calm voice. Visit the mound to slow things down, not to lecture.',
  },
  {
    id: 'nervous',
    title: 'A nervous player',
    say: ['Take a big breath with me. In, and out slow.', 'Feeling nervous means you care. That’s a good thing.', 'Just focus on seeing the ball.'],
    not: ['Don’t be nervous.', 'There’s nothing to be scared of.'],
    why: 'Naming the feeling and giving one small job works better than telling them not to feel it.',
  },
  {
    id: 'frustrated',
    title: 'A frustrated or upset player',
    say: ['I can see you’re frustrated. Take a breath and reset.', 'Even the best players miss. What will you try next time?'],
    not: ['Stop crying.', 'Get over it.'],
    why: 'Feelings pass faster when they’re heard. A short break is fine. Talk once they’ve calmed down.',
  },
  {
    id: 'noise',
    title: 'Loud crowd or parents',
    say: ['Tune it out. Eyes on the ball, listen to my voice.', 'Breathe and play your game.'],
    not: ['Ignore your dad.', 'Don’t listen to them.'],
    why: 'Give them a focus point instead of pointing at the distraction.',
  },
  {
    id: 'great-play',
    title: 'After a great play',
    say: ['That hustle got you there!', 'You practiced that, and it showed.'],
    not: ['You’re a natural.', 'You’re the best one on the team.'],
    why: 'Praise effort and practice, so they keep doing what got them there.',
  },
  {
    id: 'loss',
    title: 'After a tough loss',
    say: ['I’m proud of how you played hard to the end.', 'We’ll work on it at practice. Tonight, be proud of your effort.'],
    not: ['That was embarrassing.', 'We should have won that.'],
    why: 'Kids follow the coach’s mood. Calm and positive now, lessons at the next practice.',
  },
]

// ---------------------------------------------------------------- Guides for the night before

export const GUIDES = [
  {
    id: 'confidence',
    title: 'You can do this',
    intro: 'Most youth coaches are volunteers who said yes because someone had to. That is exactly who this app is for.',
    sections: [
      {
        h: 'What kids need from you',
        bullets: [
          'A plan, so practice keeps moving. AttaCoach handles that.',
          'Energy and encouragement. You don’t need to be an expert to be enthusiastic.',
          'Patience. Skills come slowly, and every kid learns at a different speed.',
          'Fairness. Everyone plays, everyone gets reps, everyone matters.',
        ],
      },
      {
        h: 'When you don’t know something',
        bullets: [
          'Say "Good question, let me find out." Kids respect honesty.',
          'Open the drill in the plan. Each one has steps, coaching points and what to say.',
          'Ask a parent who played to help at a station. Most love being asked.',
        ],
      },
    ],
  },
  {
    id: 'running-practice',
    title: 'Running a great practice',
    intro: 'The best youth practices are busy, short on talking, and full of reps.',
    sections: [
      {
        h: 'Keep everyone moving',
        bullets: [
          'Talk for 30 seconds, then let them try it. Correct while they play.',
          'Use stations so no group stands in a long line.',
          'Give waiting kids a job: shag balls, dry swings, or partner catch.',
          'Have the next drill set up before the current one ends.',
        ],
      },
      {
        h: 'Teaching a skill',
        bullets: [
          'Show it, say one cue, let them try it, then praise or give one fix.',
          'One fix at a time. Three corrections at once means none of them stick.',
          'Use the same short cue words every practice, like "glove down" or "eyes on it".',
        ],
      },
      {
        h: 'Helpers',
        bullets: [
          'Give each helper the drill, the goal, and one cue to say. Share the plan before practice.',
          'Put newer helpers on simple stations like tee work or partner catch.',
          'Thank them out loud in front of the team.',
        ],
      },
    ],
  },
  {
    id: 'mindset',
    title: 'The mental game for kids',
    intro: 'Baseball and softball are games of failure. Even great hitters get out most of the time. Teaching kids to handle that is one of the best things you can give them.',
    sections: [
      {
        h: 'Ideas to repeat all season',
        bullets: [
          'One pitch at a time. The last pitch is over, and the next one is all that matters.',
          'Breathe out to calm down. A slow breath out before every pitch helps.',
          'Effort and attitude are always in their control. Results are not.',
          'Mistakes are how you learn. Every great player made thousands.',
        ],
      },
      {
        h: 'How you talk',
        bullets: [
          'Tell them what to do, not what not to do. "Glove down" beats "don’t let it through."',
          'Praise effort and choices more than talent or results.',
          'Correct in private, praise in public.',
          'Your body language talks too. Stay calm in the dugout.',
        ],
      },
    ],
  },
  {
    id: 'parents',
    title: 'Working with parents',
    intro: 'Most parent trouble is avoided by saying what to expect early.',
    sections: [
      {
        h: 'Before the season',
        bullets: [
          'A short meeting or message: your goals, playing time, and how to reach you.',
          'Ask parents to cheer for effort and let the coaches coach during games.',
          'Ask who can help at practice. Even one extra adult changes what you can do.',
        ],
      },
      {
        h: 'When a parent is upset',
        bullets: [
          'Wait until the next day. Never debate after a game.',
          'Listen first, then explain your reasoning calmly.',
          'Keep the conversation about their child’s development and what they can work on.',
        ],
      },
    ],
  },
  {
    id: 'safety',
    title: 'Safety basics',
    intro: 'A few habits keep practice safe.',
    sections: [
      {
        h: 'Every practice',
        bullets: [
          'Water breaks, and more of them in the heat. Find shade when you can.',
          'Helmets on for anyone hitting, on deck or running the bases.',
          'Swinging bats need space. Set up hitting areas away from other groups and use a "bat down" rule.',
          'Warm up before throwing hard.',
        ],
      },
      {
        h: 'Pitchers and catchers',
        bullets: [
          'Count pitches and follow your league’s pitch limits and rest days.',
          'Catchers wear full gear for anything live, including bullpens.',
          'Any arm pain means stop throwing for the day and tell a parent.',
        ],
      },
    ],
  },
]
