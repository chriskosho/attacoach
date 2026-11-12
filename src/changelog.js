export const VERSION = '1.37.0'

export const CHANGELOG = [
  {
    version: '1.37.0',
    date: '2026-11-12',
    items: [
      'Sample teams are back on the first setup screen for everyone. Tap "Try a sample team" to see plans, the timer and Coach Corner right away. A sample team is marked Sample, Today offers "Set up your own", and you can delete it from the Team tab in one tap.',
      'Team setup asks how many adults usually help, counting you, and what you do: suggest, float or run a station. Every practice starts from this, and Today starts from it too.',
      'Practices are added one at a time: name and day, then length and where, then adults. A practice can have its own adults, like a cage night with fewer helpers. Then you check the list, edit or remove any practice, and save.',
      'The same steps are used when you edit how you practice from the Team tab.',
    ],
  },
  {
    version: '1.36.0',
    date: '2026-11-12',
    items: [
      'Today has one clear top: the Next practice card is raised, with a bigger headline and one big Start practice button. Open plan, Plan another practice, Browse drills, the backup reminder and the daily tip are now quiet, flat lines.',
      'Each screen has one filled button. The other choices, like Change of plans, Add a drill, Share, Back and Not now, are plain links.',
      'The plan page header is lighter: the adults line moved inside "Date, template".',
      'In the timer, each station card leads with the drill name and says how many kids and who runs it underneath. The arrow is gone.',
      'Card titles use one style everywhere. Level tags are one neutral color, so orange and red only mean a warning. Gray helper text is a little darker and tags are a little bigger. The Log hides "Season so far" until there is something to total.',
    ],
  },
  {
    version: '1.35.0',
    date: '2026-11-12',
    items: [
      'Every fold in the app now looks and works the same: the label on the left, a › on the right that turns when it opens, and at least 44 px tall. That covers "Change today\'s setup", the Coach tab, the recap ratings and the folds in Settings.',
      'The "Open with" bar on the plan page opens when you tap anywhere on it, not only on the small text.',
      'Links look the same everywhere: bold, underlined and in the app\'s accent color, including Focus, the adults line and "Date, template" on the plan page. Delete plan stays red.',
      'Today\'s Next practice card shows the focus the same way as the plan page, like "Making contact +4".',
      'Change of plans keeps the Apply button at the bottom of the sheet, so you never have to scroll to find it. "Save and start planning" fits on one line. Station rows in the timer say "Details ›", and level tags are a little bigger.',
      'Fixed: "Delete everything" in Settings was hard to read in dark mode.',
    ],
  },
  {
    version: '1.34.0',
    date: '2026-11-12',
    items: [
      'Settings opens as a short list: Coach profile, Display, Backup and restore, Share and support, Privacy, About and feedback, and Delete everything last. Tap a row to open just that part; Back returns to the list. Nothing was removed, and Delete everything still asks before it deletes.',
      'Today has one quiet "Browse drills" row under your next practice, with the drill count for your team ("83 drills for 10U"), so the whole library is one tap away without making a plan.',
      'Optional things stay out of the way. On Today, "Add your name ›" is one small link until you tap it, and the backup reminder now sits below the planning button instead of above it. On the Team tab the team details fold under one line ("Baseball · 10U · A few seasons").',
      'A new drill of your own starts with an empty Minutes box and the hint "Enter minutes (2 to 30)". Leave it empty and it is saved as 10 minutes, like before.',
      'On the Log, the likelier choice is highlighted: Practice recap when a past practice has no recap yet, Game debrief otherwise. The other one sits under "Or".',
    ],
  },
  {
    version: '1.33.0',
    date: '2026-11-12',
    items: [
      'After practice, Today moves on. When the timer reaches Practice complete, the plan is marked done, and Today shows a small line, "Today\'s practice: done ✓ · Recap ›", above your next practice (or the planning form). Once a recap is saved for that practice, the line says "Recap saved". A practice with a recap counts as done too.',
      'You can still open a finished plan and run its timer again. Older plans and backups work as before, and backups keep which practices are done.',
      'On short phones, a station block now fits every group on the screen, also when you are running late. The clock is smaller, "+1 min" and "Trim (34 min behind)" share one row, and after a trim "Trimmed 11 min" and Undo sit on that same row. Taller phones keep the usual layout.',
    ],
  },
  {
    version: '1.32.1',
    date: '2026-11-12',
    items: [
      'When you add or edit a player, a skill you mark as a strength is greyed out under Needs work, and the other way around. Tap it off in one list to pick it in the other.',
    ],
  },
  {
    version: '1.32.0',
    date: '2026-11-12',
    items: [
      'A new team\'s first plan shows Start practice and the first drill right away. The big starter box is now one quiet line, "Starter plan for 10U. Make it yours", that opens Add players and Choose skills.',
      'After Trim in the timer you see "Trimmed 6 min from the drills ahead." with an Undo that puts the times back.',
      'Save on the practice recap and game debrief stays at the bottom of the screen above the tabs, so you do not have to scroll to it.',
      'The finish screen says "Send them home with:" before the closing line, and Done now goes to Today.',
      'On the plan page, Focus, the adults line and "Date, template" look the same, and Start practice and Change of plans are the same width.',
      'On the Drills tab, rows under a category heading no longer repeat the category.',
      'The ready-made test teams are hidden in the public app. Reviewers can still reach them at the #/testing page.',
    ],
  },
  {
    version: '1.31.0',
    date: '2026-11-12',
    items: [
      'The practice recap is shorter. "Work on next time (pick up to 3)" comes first, the ratings are folded under "Rate each area (optional)", and there is one Notes box. The date and practice are one line ("Tomorrow, 60 minutes · Change").',
      'Older logs and backups open as before. If an entry had "What went well" and "What we saw", both show in Notes and are saved together when you save.',
      'On the Drills tab each category has its own heading with a drill count, and the heading stays at the top while you scroll that category. Search and filters hide headings with no matches.',
    ],
  },
  {
    version: '1.30.0',
    date: '2026-11-12',
    items: [
      'The plan page leads with the plan. The top is one line ("Tomorrow · 60 min · Cage · 12 kids") with the focus folded to "Making contact +4". The adult count is one tap that opens Change of plans, and the opening talk is one line that opens to the full talk and huddle points. The first drill now shows without scrolling, even on small phones.',
      'Tap a block to see what to say, the steps and a link to the full drill. Its buttons (Lock, minutes, Swap, Move, Add break after, Favorite, Don\'t suggest this, Remove) are behind one Edit button.',
      'Print is now inside Share, and "Build a new one" is a quiet link above Delete plan. It still asks first.',
      'On Today, once a practice is planned, planning another one is a single button, so Start practice stays at the top. The pitch-count reminder now sits right under the plan\'s blocks.',
    ],
  },
  {
    version: '1.29.0',
    date: '2026-11-12',
    items: [
      'The practice timer is easier to read at a glance. While a drill runs you see the clock, one "Say" line and what is next. The steps and coaching points are one tap away under "How it works".',
      '"Next: ..." now always sits right above Back / Pause / Next, on every phone size, and the clock and buttons stay put while a long list scrolls.',
      'The opening line and "Huddle points" show before you press Start, then get out of the way.',
      'Station rows show how many kids are in each group ("Group 1 (4 kids)"), say which group to stand with for a station the kids run, and the next-line tells you where Group 1 goes at the next rotation.',
    ],
  },
  {
    version: '1.28.0',
    date: '2026-11-12',
    items: [
      'Less to read. Today\'s Coach Corner card is now just the tip of the day with a small link. The drill page has one short caption under the picture, and coaching points come before the steps.',
      'Log: until you have run 3 practices, Season so far is one line instead of a list of "1 of 1". The skill breakdown shows up after that.',
      'Settings: About, Privacy and Backup are one line each. Tap to read the rest. Nothing was removed.',
      'On the timer, when you are running late, "Trim the rest to finish on time" is now a button next to +1 min, with the minutes behind in color. The Team page lists your game rules on one line.',
    ],
  },
  {
    version: '1.27.0',
    date: '2026-11-12',
    items: [
      'More variety for 4U and 6U teams: practices no longer flip back to the same drills every other week. Each new plan now differs from both of your last two practices, and still works on your team\'s needs and includes hitting.',
    ],
  },
  {
    version: '1.26.0',
    date: '2026-11-12',
    items: [
      'After you tap "Save backup" on Today, the card now tells you where the file went (the same note as in Settings) instead of just disappearing.',
      'Cutoffs and relays: the pitcher, catcher, runner, shortstop, third baseman, second baseman and batter no longer stand on top of each other during the play. The play is the same: "Cut! Two!" and the out at second.',
    ],
  },
  {
    version: '1.25.0',
    date: '2026-11-11',
    items: [
      'Pickle: after the tag, the out runner, the partner and the ball carrier now move one after another, so no one walks through anyone, and the loop starts over exactly as it began.',
      'Tee work and Front toss: there is always a ball in the picture. It sits on the tee or in the coach\'s hand until it is hit or tossed, and the coach brings the next one before the hitter changes.',
      'Rounding first and Cutoffs and relays fade out and back in at the restart instead of jumping everyone back to the start.',
    ],
  },
  {
    version: '1.24.0',
    date: '2026-11-11',
    items: [
      'Stations spread out the pitching: each round has at most one pitching or catcher station, so your pitchers and catchers are not stuck in back-to-back stations. If pitching is a top need, it comes back later in the practice.',
      'No more near-twins in one practice, like two catcher receiving drills, two bullpens, or two first fly-ball drills for the youngest. You can still add a second one yourself.',
      'The pitch-count reminder now reads "Count every pitch. Follow your league\'s pitch limits and rest days." It shows only when players actually throw pitches in the plan, not for dry work like the towel drill or pitchers fielding.',
    ],
  },
  {
    version: '1.23.0',
    date: '2026-11-11',
    items: [
      'New phone, or started over? The first screen now has "Restore a backup", so you can bring your teams back without setting up again.',
      'The first screen also has a one-tap "High contrast (bright sun)" link, so you can make it readable outside before you type anything.',
      'Before you restore, the preview now also shows your own drills, templates, favorites and hidden drills.',
      'After you save a backup, AttaCoach tells you where to look for the file (on iPhone: Files > Downloads, or Save to Files).',
      'Saving a plan as a template now asks for the name in the app, with the keyboard out of the way, instead of a browser pop-up.',
    ],
  },
  {
    version: '1.22.0',
    date: '2026-11-11',
    items: [
      'Send feedback: a button in Settings, and "Was this plan right?" with Yes and Not quite on the plan page and the end of the timer. You see the exact message first, and nothing is sent until you press send in your email app. Player names, your name and your team name are never included.',
      'The Log tab now starts with "Season so far": practices run, games logged, how often each skill area has been practised, and a nudge when a skill on your needs list has not been practised in three weeks.',
      'Privacy notes in Settings are now a short, plain list that covers backups, the YouTube button and feedback.',
    ],
  },
  {
    version: '1.21.0',
    date: '2026-11-11',
    items: [
      'New High contrast (bright sun) choice in Settings: white background, black text, heavier type, and a white timer with black digits.',
      'Easier to read and tap: every button, chip, arrow and plus or minus is at least 44 pixels, the Today greeting and the paused timer digits are clearer, and keyboard focus is easy to see.',
      'The drill page header now reads "Warm-up · Beginner · 8U–14U · 8 min" instead of running together.',
      'The practice timer shows three lines at a time with a More button, and the clock stays in view while you scroll.',
      'Where two big buttons competed, the lesser one is now outlined. Empty lists say what will appear and offer one action. Small phones (320 pixels wide) fit every screen.',
    ],
  },
  {
    version: '1.20.3',
    date: '2026-11-11',
    items: [
      'Moving diagrams for Everybody moves, Pitcher covers first, Bunt defense, First and third defense, Double play feeds, I got it, you take it, First to third, Team rundowns, Beat the ball and Pop-up priority: who goes where, step by step.',
      'Body-position pictures for throwing, bunting, catcher stance, blocking, the pitching balance point, backhands and forehands, ready position for the youngest, and the swing.',
      '25 more drills have a "Find a video on YouTube" button, and 13 more for softball teams. Every search was checked first; drills without a good one have none.',
    ],
  },
  {
    version: '1.19.0',
    date: '2026-11-11',
    items: [
      '20 new drills for 10U to 14U, most of them intermediate or advanced: structured bullpens with a pitch count and a goal for each set, pitchers fielding comebackers and bunts and covering home, a quicker delivery with runners on, catcher pop-ups and throws to first and third, double play turns, relay footwork, pop-up priority, gap and fence play, opposite-field hitting, live at-bats with counts, moving a runner, first to third, secondary leads and team rundowns.',
      'Drills that need leading off or stealing only show up when your league allows them.',
      'An accuracy pass over the whole library: better cues for tee work, first base footwork, backhands, catcher throws and receiving, and pitchers covering first; tighter age ranges for drills older teams outgrow; and jobs for players waiting in line.',
      'The practice opener and wrap-up now change from practice to practice.',
    ],
  },
  {
    version: '1.18.0',
    date: '2026-11-11',
    items: [
      'A softball pack of 24 drills. Fastpitch teams get windmill pitching, from grip and wrist snaps through the K drill and the full motion to location work with a catcher, plus a guide for coaches who have never pitched.',
      'Softball base running (leaving on the release, reading the ball from each base), bunting, push bunts and a first look at slap hitting, and softball bunt and slap defense.',
      'Coach-pitch and tee-ball softball teams get their own drills, and never get windmill pitching.',
      'Shared drills read right for softball: the softball strike zone, gripping a bigger ball, and the double first base. Softball video searches were each checked; drills without a good one have no video button.',
    ],
  },
  {
    version: '1.17.0',
    date: '2026-11-11',
    items: [
      '19 new drills and games. 4U and 6U teams get 12 new drills built for four- and five-year-olds: catching, throwing, ground balls, balls in the air, tee hitting, base running and warm-up games, with tennis, foam or wiffle balls and an adult at each station.',
      'Seven new closing games: Beat the ball and Fill the bucket for 4U to 6U, Toss 500 for 6U to 8U, Workup and Around the horn for 8U to 12U, and Pepper and Relay race for the older teams.',
      '500 with hit fly balls is now for 10U and up. Younger teams play Toss 500: a coach calls one player\u2019s name before each soft toss, so nobody crowds under the ball.',
      'Coach says no longer uses jumping jacks as a penalty. Nobody is out: the coach just gets a point.',
    ],
  },
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
