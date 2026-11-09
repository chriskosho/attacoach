// Loads the built app, goes offline, reloads, and builds a plan. Usage: node scripts/check-offline.cjs
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

;(async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', '4174', '--strictPort'], { stdio: 'ignore' })
  await new Promise((r) => setTimeout(r, 2500))
  const browser = await chromium.launch()
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    // Signed in once before, with a token that has long expired and no way to refresh it.
    await seed(ctx, Math.floor(Date.now() / 1000) - 86400)
    await ctx.route(API, (r) => r.abort('internetdisconnected'))
    const page = await ctx.newPage()
    await page.goto('http://localhost:4174/attacoach/')
    await page.getByText('Set up your team').waitFor()
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload()
    await page.waitForFunction(() => !!navigator.serviceWorker.controller)

    await ctx.setOffline(true)
    await page.reload()
    await page.getByLabel('Team name').fill('Offline Owls')
    await page.getByRole('button', { name: '10U', exact: true }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: /Experienced/ }).click()
    await page.getByLabel("What's your name?").fill('Pat')
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Pitching' }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Save and start planning' }).click()
    await page.getByRole('button', { name: 'Build practice plan' }).click()
    await page.getByRole('list', { name: 'Practice blocks' }).waitFor()
    const fontOk = await page.evaluate(() => document.fonts.load('700 20px "Barlow Condensed"').then((f) => f.length > 0 && f[0].status === 'loaded'))
    if (!fontOk) throw new Error('Display font did not load offline')
    console.log('Offline check passed: signed-in app loaded, team saved and plan built with no network.')
  } finally {
    await browser.close()
    server.kill()
  }
})().catch((e) => {
  console.error('Offline check FAILED:', e.message)
  process.exit(1)
})
