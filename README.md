# AttaCoach

A free, mobile-first practice planner for youth baseball and softball coaches, ages 4U to 14U. It builds a practice plan around what the team most needs to work on, runs the practice on a field timer, and learns from what the coach logs afterwards. No account, no ads, works offline.

Live app: https://chriskosho.github.io/attacoach/

## What it does

- **Setup in a minute.** Sport (baseball or softball), team name, age group, coaching experience, then optional roster, ranked team needs, league rules and weekly practices. Everything after the first two screens can be skipped. Softball teams choose fastpitch, coach pitch or tee ball (6U) and get softball wording and drills.
- **Plans from goals.** Pick a date, length, adults, kids and where you practise (field, cage, open space, gym). The plan opens with a warm-up, spends most of its time on the team's needs, always includes hitting on field days, rotates stations when there are enough adults, adds water breaks, finishes with a game and a huddle. Each new plan avoids repeating the last few practices.
- **About 154 original drills**, rated beginner, intermediate or advanced, tagged by age, space, gear, staffing and league rules (leading off, stealing, dropped third strike, kid pitching). 24 are softball-only. Drills a league does not allow never appear.
- **Drill pictures.** 16 moving top-down diagrams you can step through, and body-position strips for throwing, bunting, catching, pitching and fielding. The YouTube button opens a search that was checked first.
- **Editing and templates.** Open any block to change minutes, swap, move, lock, add a break or remove it. Save a plan as a template. "Change of plans" rebuilds around fewer kids, fewer adults, less time or a new space.
- **Field timer.** Big countdown with beep and vibration, auto-advance, station rotation calls, three reading lines at a time with More, the screen stays awake, trim-to-finish when running late, and a white high-contrast version.
- **Coach the Coach.** Huddles by age band (changing from practice to practice), "say this, not that" cues for every drill type and tough moments, and short guides.
- **Log and Season so far.** Game debriefs and practice recaps feed the next plan's suggested focus. The top of the Log tab shows practices run, games logged, how often each skill has come up in saved plans, and one nudge when a skill on the team's list has been quiet for three weeks.
- **Display.** Auto, Light, Dark, and High contrast (bright sun).
- **Safety.** Backup and restore as a file, a backup reminder, a home-screen hint, and an error screen that still offers a backup.
- **Feedback (pilot).** "Send feedback" in Settings, and "Was this plan right?" on the plan page and the timer's finish screen. Each opens the coach's own email app with a message that is shown first: app version, sport, age group, practice length and space, the plan's drill names and the coach's note. It never includes the coach's, players' or team's names, and the app sends nothing itself.
- **Private.** No analytics, tracking or ads. Teams, players, plans and the log stay in the browser on the device. The only network requests are the page itself, and the links a coach taps (YouTube search, PayPal, their email app).
- **Sign-in (built, off).** Set `VITE_AUTH_REQUIRED=true` at build time to turn it on (Supabase email link or code). Leave it off for the pilot.

## Pilot settings

| Setting | Where | Pilot value |
| --- | --- | --- |
| Feedback address | `FEEDBACK_EMAIL` in `src/config.js` | `chriskosho@gmail.com`. Set it to an empty string to hide every feedback button. |
| Ready-made test teams | `TEST_TOOLS` in `src/config.js` (off when built with `VITE_TEST_TOOLS=false`) | On: visible on the first screen and in Settings. |
| Sign-in gate | `VITE_AUTH_REQUIRED` | Off |
| Version and changelog | `VERSION` and `CHANGELOG` in `src/changelog.js`, `version` in `package.json` | Bump all three for every release. Settings, About shows the version and the two newest entries. |

## Development

```
npm install
npm run dev      # local dev server
npm test         # unit and UI tests (Vitest, Testing Library, no jest-dom matchers)
npm run build    # production build to dist/
```

Every test must pass before a push. Checks with a real browser (need Playwright and Chromium; in the Claude cloud workspace prefix with `PLAYWRIGHT_PATH=/opt/npm-tools/node_modules/playwright PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`):

```
npm run build
node scripts/walkthrough.cjs shots     # 390 px screenshots of every screen, light and dark
node scripts/check-offline.cjs         # loads the app, goes offline, saves a team, builds a plan
VITE_AUTH_REQUIRED=true npm run build  # then, only when testing the sign-in gate:
node scripts/check-auth.cjs
```

The offline check's font test fails about one run in six; run it again before investigating.

## Code map

- `src/data/drills*.js`: the drill library (base, more, young, older, softball). `drillTags.js` holds age, space, gear, staffing, sport and rule tags; `drillSoftball.js` softball wording; `video.js` the checked YouTube searches.
- `src/data/diagrams.js`, `diagramBg.js`, `poses.js`: drill pictures and body-position strips.
- `src/data/constants.js`: divisions, rules, needs, levels, categories, spaces.
- `src/data/coaching.js`, `motivation.js`: huddles, cues, guides, team talks.
- `src/data/scenarios.js`: the ready-made test teams.
- `src/lib/plan.js`: the plan engine and editing helpers (pure functions). `sport.js`: softball wording and fit rules. `changes.js`: change of plans.
- `src/lib/debrief.js`: log helpers and next-focus suggestion. `season.js`: the Season so far numbers. `feedback.js`: the feedback message.
- `src/lib/db.js`: device storage (Dexie / IndexedDB), backup and restore.
- `src/lib/auth.js`, `supabase.js`, `src/config.js`: the sign-in gate and public settings.
- `src/components/`: screens. `src/styles.css`: all styles, with variables for light, dark and sun mode.
- `scripts/`: browser checks and the offline service worker.

## Deploy

Every push to `main` runs the tests, builds and deploys to GitHub Pages through `.github/workflows/deploy.yml`. Pages must be set to deploy from **GitHub Actions** in the repo settings. If the deploy job fails with a GitHub internal error, re-run it.

## Supabase setup (only needed before turning the sign-in gate on)

1. Dashboard > Authentication > URL Configuration: set Site URL and add a redirect URL of `https://chriskosho.github.io/attacoach/`.
2. Authentication > Email Templates > Magic Link: include both `{{ .ConfirmationURL }}` (the link) and `{{ .Token }}` (the code).
3. Authentication > SMTP: configure a custom sender (for example Resend). The default sender only emails your own organization's team members and is rate limited.
4. Apply the `delete_my_account` function (see `supabase/delete_my_account.sql`) so Delete account works.
