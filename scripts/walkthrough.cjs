// Drives the built app at phone width and saves screenshots. Usage: node scripts/walkthrough.cjs <outDir>
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright')
const { spawn } = require('child_process')

const API = /pretxxjkcngmnksepwbt\.supabase\.co/
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const USER = { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'coach@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-11-08T00:00:00Z' }
const sessionJson = (expiresAt) => JSON.stringify({
  access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER.id, exp: expiresAt })}.sig`,
  token_type: 'bearer', expires_in: 3600, expires_at: expiresAt, refresh_token: 'refresh-1', user: USER,
})
// Puts a sign-in on the device once per tab, so signing out in a script sticks.
const seed = (ctx, expiresAt) => ctx.addInitScript(([k, v]) => {
  if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1') }
}, ['attacoach-auth', sessionJson(expiresAt)])
const reply = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

const out = process.argv[2] || 'screenshots'
const URL = 'http://localhost:4173/attacoach/'

const AUTH_ON = process.env.VITE_AUTH_REQUIRED === "true"
;(async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' })
  await new Promise((r) => setTimeout(r, 2500))
  const browser = await chromium.launch()
  const errors = []
  try {
    for (const scheme of ['light', 'dark']) {
      // The gate, as a brand-new visitor sees it (only when built with VITE_AUTH_REQUIRED=true).
      if (AUTH_ON) {
        const gctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme })
        await gctx.route(API, (r) => (r.request().url().includes('/auth/v1/otp') ? reply(r, {}) : r.abort()))
        const gpage = await gctx.newPage()
        gpage.on('pageerror', (e) => errors.push(e.message))
        await gpage.goto(URL)
        await gpage.getByText('Sign in or create your account').waitFor()
        await gpage.screenshot({ path: `${out}/${scheme}-00-gate.png`, fullPage: true })
        await gpage.getByLabel('Email').fill('coach@example.com')
        await gpage.getByRole('button', { name: 'Email me a sign-in link' }).click()
        await gpage.getByText('Check your email').waitFor()
        await gpage.screenshot({ path: `${out}/${scheme}-00b-gate-sent.png`, fullPage: true })
        await gctx.close()
      }
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme })
      await seed(ctx, Math.floor(Date.now() / 1000) + 3000)
      await ctx.route(API, (r) => reply(r, USER))
      const page = await ctx.newPage()
      page.on('pageerror', (e) => errors.push(e.message))
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
      const shot = (name) => page.screenshot({ path: `${out}/${scheme}-${name}.png`, fullPage: true })
      await page.goto(URL)
      await page.getByText('Set up your team').waitFor()
      await shot('01-welcome')
      await page.getByLabel("What's your name?").fill('Chris')
      await page.getByText('Ready-made test teams').click()
      await shot('01a-test-tools')
      await page.getByText('Ready-made test teams').click()
      await page.getByLabel('Team name').fill('Blue Jays')
      // A softball team, so the sport choice and softball wording show up in the screenshots.
      await page.getByRole('button', { name: 'Softball', exact: true }).click()
      await page.getByRole('button', { name: '12U', exact: true }).click()
      await shot('01b-you-and-team')
      await page.getByRole('button', { name: 'Next' }).click()
      await page.getByRole('button', { name: /A few seasons/ }).click()
      await page.getByRole('button', { name: 'Bunting' }).click()
      await shot('02-experience')
      await page.getByRole('button', { name: 'Next' }).click()
      await page.getByRole('button', { name: 'Add a player' }).click()
      await page.getByRole('dialog').getByLabel('First name').fill('Sam')
      await shot('02a-add-player-name')
      await page.getByRole('dialog').getByRole('button', { name: 'Next' }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Developing' }).click()
      await page.getByRole('group', { name: 'Needs work' }).getByRole('button', { name: 'Catching fly balls' }).click()
      await page.getByRole('group', { name: 'Needs work' }).getByRole('button', { name: 'Throwing accuracy' }).click()
      await page.getByRole('group', { name: 'Strengths' }).getByRole('button', { name: 'Making contact' }).click()
      await page.getByRole('group', { name: 'Positions' }).getByRole('button', { name: 'Shortstop' }).click()
      await page.getByRole('group', { name: 'Positions' }).getByRole('button', { name: 'Second base' }).click()
      await shot('02b-player')
      await page.getByRole('button', { name: 'Save and add next' }).click()
      for (const n of ['Lee Kim', 'Jordan', 'Avery']) {
        await page.getByRole('dialog').getByLabel('First name').fill(n)
        await page.getByRole('button', { name: 'Save without details' }).click()
      }
      await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click()
      await shot('02c-players')
      await page.getByRole('button', { name: 'Next' }).click()
      await page.getByRole('button', { name: 'Base running' }).click()
      await page.getByRole('button', { name: 'Move Base running up' }).click()
      await shot('03-needs')
      await page.getByRole('button', { name: 'Next' }).click()
      await shot('04-rules')
      await page.getByRole('button', { name: 'Next' }).click()
      await page.getByRole('button', { name: 'Add a practice' }).click()
      await page.getByRole('group', { name: 'Day for Field practice' }).getByRole('button', { name: 'Tue' }).click()
      await page.getByRole('group', { name: 'Length for Field practice' }).getByRole('button', { name: '90' }).click()
      await page.getByRole('button', { name: 'Add a practice' }).click()
      await page.getByRole('group', { name: 'Day for Cage practice' }).getByRole('button', { name: 'Thu' }).click()
      for (const g of ['Batting tees', 'Pitching machine', 'Pitching net or strike target']) {
        await page.getByRole('group', { name: 'Equipment' }).getByRole('button', { name: g }).click()
      }
      await shot('04a-practice')
      await page.getByRole('button', { name: 'Save and start planning' }).click()
      await page.getByRole('list', { name: 'Practice blocks' }).waitFor()
      await shot('04b-first-plan')
      // Today with a plan for today: Next practice leads, and Start practice is on the first screen.
      await page.getByRole('button', { name: 'Today', exact: true }).click()
      await page.getByText('Next practice').waitFor()
      const todayFit = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Start practice')
        return { start: b ? b.getBoundingClientRect().bottom : 9999, height: window.innerHeight }
      })
      console.log('today screen', JSON.stringify(todayFit))
      if (todayFit.start > todayFit.height) throw new Error(`Start practice is below the fold on Today: ${JSON.stringify(todayFit)}`)
      await shot('04c-today-with-plan')
      // Today with no plan yet: delete this plan, look, then carry on.
      await page.getByRole('button', { name: 'Open plan' }).click()
      await page.getByRole('list', { name: 'Practice blocks' }).waitFor()
      page.once('dialog', (d) => d.accept())
      await page.getByRole('button', { name: 'Delete plan' }).click()
      await page.getByRole('button', { name: 'Today', exact: true }).click()
      await page.getByText('Plan a practice').waitFor()
      await shot('04d-today-no-plan')
      await page.getByRole('button', { name: /^Cage practice/ }).click()
      await page.locator('details.day-setup summary').click()
      await page.getByRole('button', { name: 'More: Adults at practice' }).click()
      await shot('05-today')
      await page.getByRole('button', { name: 'More in Coach Corner ›' }).click()
      await page.getByText('Pre-game huddle').click()
      await page.getByText('After a strikeout').click()
      await shot('05b-coach')
      await page.getByRole('button', { name: 'Today', exact: true }).click()
      await page.getByText('Plan a practice').waitFor()
      await page.getByRole('button', { name: 'Build practice plan' }).click()
      await page.getByRole('list', { name: 'Practice blocks' }).waitFor()
      await shot('06-plan')
      await page.getByRole('button', { name: 'Change of plans' }).click()
      await page.getByRole('dialog', { name: 'Change of plans' }).waitFor()
      await page.getByRole('button', { name: 'Short on kids' }).click()
      await page.getByRole('button', { name: "I'm the only adult" }).click()
      await shot('06b-change-of-plans')
      await page.getByRole('button', { name: 'Moved indoors' }).click()
      await page.getByRole('button', { name: 'Apply changes' }).click()
      await page.getByRole('button', { name: 'Undo' }).waitFor()
      await shot('06c-plan-changed')
      await page.getByRole('button', { name: 'Undo' }).click()
      const items = page.getByRole('list', { name: 'Practice blocks' }).getByRole('listitem')
      await items.nth(3).locator('.slot-head').first().click()
      await shot('07-plan-open')
      // Make it theirs: lock a block (its buttons sit behind Edit), save a template, and see it on Today.
      await items.nth(3).getByRole('button', { name: 'Edit', exact: true }).click()
      await shot('07-plan-edit')
      await items.nth(3).getByRole('button', { name: 'Lock' }).click()
      await page.getByRole('button', { name: 'Rebuild the rest' }).waitFor()
      await shot('07a-plan-locked')
      await page.getByText('Date and template').click()
      await page.getByRole('button', { name: 'Save as a template' }).click()
      await page.getByRole('dialog', { name: 'Name this template' }).waitFor()
      await shot('07b0-template-sheet')
      await page.getByLabel('Template name').fill('Cage day basics')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await page.getByText(/Saved "Cage day basics"/).waitFor()
      await shot('07b-plan-template')
      await page.getByRole('button', { name: 'Today', exact: true }).click()
      // With a practice planned, the planning form is one tap away.
      await page.getByText(/^Plan (another|a) practice$/).first().waitFor()
      const another = page.getByRole('button', { name: 'Plan another practice' })
      if (await another.count()) await another.click()
      await page.getByLabel('Start from a template').waitFor()
      await shot('07c-today-template')
      await page.goBack()
      await page.getByRole('list', { name: 'Practice blocks' }).waitFor()
      await page.getByRole('button', { name: 'Start practice' }).click()
      await page.getByRole('timer').waitFor()
      await page.getByRole('button', { name: 'Start' }).waitFor()
      await shot('08a-timer-first')
      // The first block shows its name, time, the Say line, what is next and the Start button without scrolling.
      const fit = await page.evaluate(() => {
        const bottom = (el) => (el ? el.getBoundingClientRect().bottom : 9999)
        return { start: bottom(document.querySelector('.run-controls .main')), say: bottom(document.querySelector('.run-cue')), next: bottom(document.querySelector('.run-next')), height: window.innerHeight }
      })
      console.log('first timer screen', JSON.stringify(fit))
      if (fit.start > fit.height || fit.say > fit.height || fit.next > fit.height) throw new Error(`first timer screen does not fit: ${JSON.stringify(fit)}`)
      await page.getByRole('button', { name: 'Start' }).click()
      await page.waitForTimeout(1500)
      await shot('08-timer')
      await page.getByRole('button', { name: 'Next block' }).click()
      await page.getByRole('button', { name: 'Next block' }).click()
      await page.getByRole('button', { name: 'Next block' }).click()
      await shot('09-timer-stations')
      const row = page.locator('.run-station-head').first()
      if (await row.count()) {
        await row.click()
        await shot('09b-timer-station-open')
        await row.click()
      }
      // Pretend practice started 50 minutes ago (after skipping ahead), to show the running-late line.
      await page.evaluate(() => {
        for (const k of Object.keys(localStorage)) {
          if (!k.startsWith('run:')) continue
          const v = JSON.parse(localStorage.getItem(k))
          v.startedWall = Date.now() - 50 * 60 * 1000
          localStorage.setItem(k, JSON.stringify(v))
        }
      })
      await page.reload()
      await page.getByRole('timer').waitFor()
      await page.getByText(/behind/).waitFor()
      await shot('09c-timer-late')
      page.once('dialog', (d) => d.accept())
      await page.getByRole('button', { name: 'Exit' }).click()
      await page.getByRole('button', { name: 'Drills' }).click()
      await shot('10-drills')
      await page.locator('.drill-row').first().click()
      await shot('11-drill')
      await page.getByRole('button', { name: '☆ Favorite' }).click()
      await page.getByRole('button', { name: '★ Favorite' }).waitFor()
      await shot('11a-drill-favorite')
      await page.getByRole('button', { name: 'Drills' }).click()
      await page.getByRole('button', { name: 'Add your own drill' }).click()
      await page.getByLabel('Name').fill('Two-ball relay')
      await page.getByLabel('Category').selectOption('game')
      await page.getByRole('group', { name: 'What it works on' }).getByRole('button').first().click()
      await page.getByRole('button', { name: 'Whole team' }).click()
      await page.getByLabel('Steps, one per line').fill('Two lines facing a bucket.\nField it, throw it in, run to the back.\nFirst line to finish wins.')
      await shot('11b-my-drill-form')
      await page.getByRole('button', { name: 'Save drill' }).click()
      await page.getByText('Yours').first().waitFor()
      await shot('11c-my-drill')
      await page.getByRole('button', { name: 'Drills' }).click()
      await page.getByRole('combobox', { name: 'Show' }).selectOption('yours')
      await shot('11d-drills-mine')
      await page.getByRole('combobox', { name: 'Show' }).selectOption('')
      await page.getByRole('button', { name: 'Log' }).click()
      await page.getByText('Nothing logged yet').waitFor()
      await shot('12a-log-empty')
      await page.getByRole('button', { name: 'Game debrief' }).click()
      await page.getByLabel('Opponent').fill('Tigers')
      await page.getByLabel('Our runs').fill('4')
      await page.getByLabel('Their runs').fill('9')
      await page.getByText('Rate each area (optional)').click()
      await page.getByRole('group', { name: 'Hitting' }).getByRole('button', { name: 'Needs work' }).click()
      await page.getByRole('group', { name: 'Throwing' }).getByRole('button', { name: 'Strong' }).click()
      await page.getByLabel('Notes').fill('Chased high pitches. Great hustle on the bases.')
      await shot('12b-debrief')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await page.getByRole('heading', { name: 'Work on next' }).waitFor()
      await shot('12c-log')
      await page.getByRole('button', { name: 'Plan next practice' }).click()
      await page.getByRole('region', { name: 'Suggested focus' }).waitFor()
      await shot('12d-today-suggestion')
      await page.getByRole('button', { name: 'Team', exact: true }).click()
      await page.getByRole('heading', { name: 'Players' }).waitFor()
      await shot('12-team')
      await page.getByRole('button', { name: 'Settings' }).click()
      await page.getByRole('heading', { name: 'Display' }).waitFor()
      if (AUTH_ON) await page.getByRole('heading', { name: 'Account' }).waitFor()
      await shot('12e-settings')
      await page.getByRole('button', { name: 'Coach', exact: true }).click()
      await page.getByRole('heading', { name: 'Game day huddles' }).waitFor()
      await shot('12f-coach-tab')

      // Safety cards. This team has a roster and no backup, so the backup card leads.
      await page.getByRole('button', { name: 'Today', exact: true }).click()
      await page.getByRole('region', { name: 'Backup reminder' }).waitFor()
      await shot('13a-backup-card')
      // Never both: dismissing the backup card lets the home screen hint show (Android prompt, then iPhone steps).
      await page.getByRole('region', { name: 'Backup reminder' }).getByRole('button', { name: 'Not now' }).click()
      await page.evaluate(() => {
        const ev = new Event('beforeinstallprompt', { cancelable: true })
        ev.prompt = () => Promise.resolve()
        ev.userChoice = Promise.resolve({ outcome: 'dismissed' })
        window.dispatchEvent(ev)
      })
      await page.getByRole('region', { name: 'Add to home screen' }).waitFor()
      await shot('13b-home-screen-android')
      await page.addInitScript(() => Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', configurable: true }))
      await page.reload()
      await page.getByRole('region', { name: 'Add to home screen' }).waitFor()
      await shot('13c-home-screen-iphone')
      await page.getByRole('button', { name: 'Settings' }).click()
      await page.getByText('About backups').click()
      await page.getByTestId('storage-line').waitFor()
      console.log('storage line:', await page.getByTestId('storage-line').textContent())
      await shot('13d-settings-storage')

      // The error screen: a damaged plan crashes its page (the console errors are expected); the backup button still works.
      const before = errors.length
      await page.evaluate(
        () =>
          new Promise((resolve, reject) => {
            const open = indexedDB.open('attacoach')
            open.onsuccess = () => {
              const tx = open.result.transaction('plans', 'readwrite')
              tx.objectStore('plans').put({ id: 'bad-plan', teamId: 'x', createdAt: '2026-11-01T00:00:00Z', blocks: null })
              tx.oncomplete = () => (open.result.close(), resolve())
              tx.onerror = () => reject(tx.error)
            }
            open.onerror = () => reject(open.error)
          }),
      )
      await page.goto(URL + '#/plan/bad-plan')
      await page.reload()
      await page.getByRole('alert').waitFor()
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save a backup first' }).click()])
      console.log('error screen backup:', download.suggestedFilename())
      await page.getByText(/Saved a backup of/).waitFor()
      await shot('13e-error-screen')
      errors.length = before
      await page.evaluate(
        () =>
          new Promise((resolve) => {
            const open = indexedDB.open('attacoach')
            open.onsuccess = () => {
              const tx = open.result.transaction('plans', 'readwrite')
              tx.objectStore('plans').delete('bad-plan')
              tx.oncomplete = () => (open.result.close(), resolve())
            }
          }),
      )
      await ctx.close()
    }
  } finally {
    await browser.close()
    server.kill()
  }
  if (errors.length) {
    console.log('Console errors:\n' + errors.join('\n'))
    process.exitCode = 1
  } else console.log('Walkthrough OK')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
