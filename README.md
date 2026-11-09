# AttaCoach

Practice plans for youth baseball coaches, built around what the team most needs to work on.

Live app: https://chriskosho.github.io/attacoach/

## What it does

- **Team setup.** Division (4U–14U), the coach's experience, the team's top three developmental needs, and game rules. Rules default to the standard game: players pitch, stealing, leading off and the dropped third strike start at 10U. Each can be turned off for a local league.
- **Goal-based plans.** Pick a date, practice length and number of coaches. The plan opens with an age-appropriate warm-up, includes catch play from 8U, spends most of its time on the chosen needs, rotates stations when there are two or more coaches, adds water breaks, finishes with a game and closes with a team huddle.
- **Rated drills.** About 70 original drills across warm-ups, throwing, infield, outfield, hitting, base running, pitching, catching, team defense and games. Each is rated beginner, intermediate or advanced. New coaches get beginner drills with full write-ups; experienced coaches get harder drills and short notes.
- **Editing.** Open any block to see the drill, change minutes, swap it for a similar drill, move it, add a break or remove it (with undo). Add any drill from the library.
- **Field timer.** Big scoreboard countdown, auto-advance with a beep and vibration, station rotation calls, coaching points, and the screen stays on.
- **Motivation.** An opening talk and a closing huddle message matched to the age group, plus a coach's tip.
- **Share and print.** Text the plan to assistant coaches or print it.
- **Offline and installable.** Works with no signal at the field once loaded. Add it to the home screen.
- **Private.** No accounts, ads or tracking. Data stays in the browser on the device, with backup and restore as a JSON file.

## Development

```
npm install
npm run dev      # local dev server
npm test         # unit and UI tests (Vitest)
npm run build    # production build to dist/
```

Checks with a real browser (needs Playwright and Chromium):

```
npm run build
node scripts/check-offline.cjs        # loads the app, goes offline, builds a plan
node scripts/walkthrough.cjs shots    # phone-width screenshots of every screen
```

## Code map

- `src/data/drills.js`: the drill library.
- `src/data/constants.js`: divisions, rules and their defaults, needs, levels, categories.
- `src/data/motivation.js`: team talks and coach tips.
- `src/lib/plan.js`: the plan engine and editing helpers (pure functions).
- `src/lib/db.js`: device storage (Dexie / IndexedDB), backup and restore.
- `src/components/`: screens.
- `scripts/sw-plugin.js`, `scripts/sw.template.js`: offline service worker.

## Deploy

Every push to `main` runs the tests, builds and deploys to GitHub Pages through `.github/workflows/deploy.yml`. Pages must be set to deploy from **GitHub Actions** in the repo settings.
