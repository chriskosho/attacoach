# AttaCoach

Practice plans for youth baseball coaches, built around what the team most needs to work on.

Live app: https://chriskosho.github.io/attacoach/

## What it does

- **Team setup.** The coach's name, division (4U–14U), experience, a ranked list of every developmental need that applies (tap to add, arrows to reorder), and game rules. Rules default to the standard game: players pitch, stealing, leading off and the dropped third strike start at 10U. Each can be turned off for a local league.
- **Goal-based plans.** Pick a date, practice length and number of coaches. The plan opens with an age-appropriate warm-up, includes catch play from 8U, spends most of its time on the chosen needs, rotates stations when there are two or more coaches, adds water breaks, finishes with a game and closes with a team huddle.
- **Rated drills.** About 70 original drills across warm-ups, throwing, infield, outfield, hitting, base running, pitching, catching, team defense and games. Each is rated beginner, intermediate or advanced. New coaches get beginner drills with full write-ups; experienced coaches get harder drills and short notes.
- **Editing.** Open any block to see the drill, change minutes, swap it for a similar drill, move it, add a break or remove it (with undo). Add any drill from the library.
- **Field timer.** Big scoreboard countdown, auto-advance with a beep and vibration, station rotation calls, coaching points, and the screen stays on.
- **Motivation.** An opening talk and a closing huddle message matched to the age group, plus a coach's tip.
- **Game debriefs and practice recaps.** The Log tab records what the coach saw (ratings by area, notes, what to work on). The next plan suggests a focus from recent entries, weighting newer ones more.
- **Share and print.** Text the plan to assistant coaches or print it.
- **Offline and installable.** Works with no signal at the field once loaded. Add it to the home screen.
- **Sign-in gate (built, currently off).** Set `VITE_AUTH_REQUIRED=true` at build time to turn it on. Coaches sign up with an email link or a code (Supabase). Once signed in, the app works offline from the cached sign-in. The gate is a sign-up wall, not security: team data never leaves the device.
- **Share and support.** A Share AttaCoach button (Web Share, with a copy fallback) and a PayPal donate link on the Team tab.
- **Private.** No ads or tracking. Teams and plans stay in the browser on the device, with backup and restore as a JSON file. Sign out and delete account are on the Team tab.

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
VITE_AUTH_REQUIRED=true npm run build  # then:
node scripts/check-auth.cjs           # gate, link and code sign-in, cached sign-in offline
node scripts/check-offline.cjs        # loads the app, goes offline, builds a plan
node scripts/walkthrough.cjs shots    # phone-width screenshots of every screen
```

## Code map

- `src/data/drills.js`: the drill library.
- `src/data/constants.js`: divisions, rules and their defaults, needs, levels, categories.
- `src/data/motivation.js`: team talks and coach tips.
- `src/lib/plan.js`: the plan engine and editing helpers (pure functions).
- `src/lib/auth.js`, `src/lib/supabase.js`, `src/config.js`: sign-in, the Supabase client and app links.
- `src/lib/debrief.js`: log helpers and the next-focus suggestion.
- `src/lib/db.js`: device storage (Dexie / IndexedDB), backup and restore.
- `src/components/`: screens.
- `scripts/sw-plugin.js`, `scripts/sw.template.js`: offline service worker.

## Deploy

Every push to `main` runs the tests, builds and deploys to GitHub Pages through `.github/workflows/deploy.yml`. Pages must be set to deploy from **GitHub Actions** in the repo settings.


## Supabase setup (required before turning the gate on)

1. Dashboard > Authentication > URL Configuration: set Site URL and add a redirect URL of `https://chriskosho.github.io/attacoach/`.
2. Authentication > Email Templates > Magic Link: include both `{{ .ConfirmationURL }}` (the link) and `{{ .Token }}` (the code).
3. Authentication > SMTP: configure a custom sender (for example Resend). The default sender only emails your own organization's team members and is rate limited, so strangers cannot sign up without this.
4. Apply the `delete_my_account` function (see `supabase/delete_my_account.sql`) so Delete account works.
