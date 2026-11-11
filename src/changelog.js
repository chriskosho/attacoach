export const VERSION = '1.16.0'

export const CHANGELOG = [
  {
    version: '1.16.0',
    date: '2026-11-11',
    items: [
      'Favorite a drill, or tell AttaCoach "Don\u2019t suggest this", from the drill page or a plan block\u2019s edit bar. Plans pick favorites a bit more often (still mixing things up) and never pick drills you hid. You can still add a hidden drill to a plan yourself.',
      'Add your own drills on the Drills tab: name, category, minutes, what it works on, where it can be run, small group or whole team, and the steps. They get a "Yours" badge, plans can pick them, and you can edit or delete them. Plans that used a deleted drill still show its name.',
      'Lock any block in a plan from its edit bar. "Build a new one" then becomes "Rebuild the rest": locked blocks keep their drill, minutes and place.',
      'Save a plan you like as a template (under "Date and template" on the plan). On Today, "Start from a template" builds it again, fitted to today\u2019s kids and adults.',
      'Backups now include favorites, hidden drills, your own drills and templates. Older backups still restore.',
    ],
  },
  {
    version: '1.15.0',
    date: '2026-11-11',
    items: [
      'AttaCoach now asks your browser to keep your teams and plans. Settings says plainly whether it agreed, and when your last backup was.',
      'If you have players or a few plans and no backup for 2 weeks, Today shows a small "Save a backup (takes 10 seconds)" card. Tap Not now and it stays away for 2 weeks.',
      'On a phone browser, a one-time card shows how to add AttaCoach to your home screen. It never shows in the installed app, and never at the same time as the backup card.',
      'If the app ever hits an error, you now get a calm screen with Reload and Save a backup first, instead of a blank page.',
      'Restoring a backup now shows what is in it (teams, players, plans and dates) and asks before adding it.',
    ],
  },
  {
    version: '1.14.0',
    date: '2026-11-11',
    items: [
      'Today now leads with your next practice (today or later): the day, length and focus, with Start practice and Open plan. Building a new plan is just the practice, the date and one button; length, adults, kids, space, equipment, warm-up and focus are under "Change today\u2019s setup", which shows the current choices in one line.',
      'If your latest practice has passed and has no recap yet, Today asks "How did it go?" with a link to the 2-minute recap.',
      'New "Change of plans" on the plan page: set kids, adults, minutes and space, or tap "Short on kids", "I\u2019m the only adult" or "Moved indoors". Drills that still fit stay, and the app tells you what it swapped and why. One tap on Undo brings the old plan back.',
      'The plan page opens with a summary line. The date is behind "Change the date", and Delete plan is a quiet link at the very bottom.',
      'Kids expected on Today now starts from your roster, even a small one.',
    ],
  },
  {
    version: '1.13.0',
    date: '2026-11-11',
    items: [
      'The practice timer shows each group as "Group 1 \u2192 Line drive target" with who runs it. Tap a row to read how the station works, what to say and its picture, without leaving the timer or stopping the clock.',
      'Drills with a picture get a quiet "Show picture" button. The huddle points on the first screen are one tap away, and the Start button now stays at the bottom of the screen.',
      'Running late? "+1 min" adds a minute to the block you are in. When practice is more than 3 minutes behind, a quiet line offers "Trim the rest to finish on time", which shortens the drills still ahead (never below 60%) and leaves water breaks and the closing huddle alone. Your saved plan is not changed.',
      'If the phone sleeps past the end of a block, the timer now catches up to the right block and the right time left.',
      'When practice ends, the main button is "2-minute recap", which opens the recap for that practice with its date filled in.',
    ],
  },
  {
    version: '1.12.0',
    date: '2026-11-11',
    items: [
      'Baseball or softball: pick your sport when you set up a team, and change it any time with Edit on the Team tab. Softball teams also pick who pitches: fastpitch, coach pitch, or (at 6U) tee ball. Teams you already have stay baseball.',
      'Softball teams never get baseball-only drills, like pickoff moves, leading off before the pitch, or overhand pitching from a leg lift. Shared drills use softball words where it matters, and video searches say softball.',
      'For softball, the leading-off rule reads "Leaving on the pitch". In fastpitch, players pitch; in coach pitch and tee ball they don\u2019t. As always, set the rules to match your league.',
      'Three softball test teams: 6U tee ball, 8U coach pitch and 12U fastpitch. Softball pitching drills are still to come, so softball plans have little pitching work for now.',
    ],
  },
  {
    version: '1.11.0',
    date: '2026-11-11',
    items: [
      'Every practice on a field, in a cage or on open grass now includes hitting, at least about 15% of the time. Teams whose players pitch get pitching or catcher work in practices of 75 minutes or more. You can still remove or swap any of it.',
      'Practices change from week to week. The planner looks back at your last four practices and steps away from drills you just ran, rotates the warm-up, and never closes with the same game twice in a row when another one fits. Throwing progression and arm care still come every time.',
      'Lower-ranked needs now get their turn across practices instead of the top needs filling every short practice.',
      'The first plan after setup uses what you entered: your first practice\u2019s length and space, your equipment and your roster size.',
      'The closing talk fits the day: a hitting practice no longer ends with "ten minutes of catch at home", and a cage day opens on hitting.',
    ],
  },
  {
    version: '1.10.0',
    date: '2026-11-09',
    items: [
      'Three more drill diagrams. Star drill: the ball draws the star while each thrower follows the throw, with a running count of catches in a row. Front toss: the coach tosses through the low side of the L-screen and is fully behind it before the swing. Cutoffs and relays: one full play (single to center, runner on 2nd) where the cutoff lines up, the catcher calls "Cut! Two!" and the out is made at second.',
      'Front toss gets a "Find a video on YouTube" button. The star drill does not: searches for it bring up unrelated throwing videos.',
    ],
  },
  {
    version: '1.9.1',
    date: '2026-11-09',
    items: [
      'Rebuilt the drill animations. Round first: a smooth banana turn outside the cone, then the runner finds the ball in left field and gets back. Pickle: a close-up of two bases where you can see the ball, the "now!" call, one throw, one tag and the rotation. Tee work: the coach steps in to re-tee and give one cue between swings, then stands off to the side; the hitter walks behind the line; and all four swing positions show under the picture, with the current one highlighted.',
      'Redrew the swing and fielding positions: hands by the back shoulder in the stance, a firm front leg at contact, and the bat wrapped behind the head at the finish.',
    ],
  },
  {
    version: '1.9.0',
    date: '2026-11-09',
    items: [
      'First drill visuals: a moving top-down diagram for Round first on a hit, Pickle and Tee work, and body-position pictures for Tee work and Funnel grounders. Simple drills stay words only.',
      'A "Find a video on YouTube" button on skill drills, using a plain search phrase that was tested to bring up relevant videos.',
      'Tee work now has the coach in it: re-tee, one cue, and a round of swings per hitter.',
    ],
  },
  {
    version: '1.8.0',
    date: '2026-11-09',
    items: [
      'Review tools: skip setup from the first screen, or load a ready-made test team (T-ball, rookie 8U, full 10U roster, over-rostered 12U, different league rules, cage-only).',
      'Settings has the same teams under Testing tools, plus a way to start over and replay setup.',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-11-09',
    items: [
      'Adding players is now a quick popup: type a name, pick strengths and needs work, then add the next player or finish.',
      'New Settings page (the gear in the top corner) for your name, display, backup, sharing and account. The Team tab now holds just your team.',
      'Coach Corner is now its own tab: huddles, what to say in tough moments, and guides for the night before.',
    ],
  },
  {
    version: '1.6.0',
    date: '2026-11-09',
    items: [
      'New Coach the Coach section: game day huddles, what to say in tough moments, and short guides for the night before.',
      'Every drill now has a "say this, not that" cue, also shown on the practice timer.',
      'Practice plans include huddle talking points for the opener and the wrap-up.',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-11-09',
    items: [
      'Tell AttaCoach how you practice: your weekly practices, where (field, cage, open grass, gym) and the equipment you have.',
      'Plans fit the day: cage days lean to hitting, and drills match your space and gear, with a quick swap when gear is missing.',
      'Stations are built from the kids and adults you have. AttaCoach suggests who runs what and whether you float or run a station.',
      'Helper cancelled? Change the adult count on the plan and it reworks the stations.',
      'Optional athletic warm-up: a no-equipment routine that scales with age.',
      '21 new drills for cages, open grass, gyms and practice equipment.',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-11-09',
    items: [
      'Quicker start: your name, team and division first, and you land on a ready-made practice plan.',
      'Add your players (first name is enough) with a rating, strengths, needs and positions. Everything beyond the name is optional.',
      'Team needs can start from your players, and you can skip them for a starter plan on the basics.',
      'Tell AttaCoach what you feel least sure teaching and those drills show the full explanation.',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-11-09',
    items: [
      'AttaCoach asks your name and uses it in greetings and on shared plans.',
      'Choose every skill your team needs, then rank them. Tap to add, use the arrows to reorder.',
      'Plans work down your ranked list and spend the most time on number 1.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-11-09',
    items: [
      'New Log tab: debrief a game or recap a practice in about two minutes.',
      'Your next practice suggests what to work on, based on what you logged.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-11-08',
    items: [
      'Share AttaCoach with another coach, and a PayPal link to support it.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-11-08',
    items: [
      'Team setup: division, coaching experience, biggest needs and game rules.',
      'Goal-based practice plans with warm-ups, stations, water breaks and a team huddle.',
      'Drill library rated beginner, intermediate and advanced.',
      'Field timer with rotation calls, works offline.',
      'Share or print plans for assistant coaches.',
    ],
  },
]
