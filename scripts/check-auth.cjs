// Drives the built app in Chromium with the real Supabase client and a stubbed network.
// Usage: npm run build && node scripts/check-auth.cjs
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright')
const { spawn } = require('child_process')

const PORT = 4175
const URL = `http://localhost:${PORT}/attacoach/`
const KEY = 'attacoach-auth'
const API = /pretxxjkcngmnksepwbt\.supabase\.co/

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = (exp) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER.id, role: 'authenticated', exp })}.sig`
const now = () => Math.floor(Date.now() / 1000)
const USER = {
  id: '11111111-1111-1111-1111-111111111111',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'coach@example.com',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-11-08T00:00:00Z',
}
const session = (expiresAt) => ({
  access_token: jwt(expiresAt),
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: expiresAt,
  refresh_token: 'refresh-1',
  user: USER,
})
const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

const GATE = 'Sign in or create your account'
const APP = 'Set up your team'

async function seed(ctx, s) {
  await ctx.addInitScript(
    ([k, v]) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(k, v)
        sessionStorage.setItem('seeded', '1')
      }
    },
    [KEY, JSON.stringify(s)],
  )
}

const results = []
async function check(name, fn) {
  try {
    await fn()
    results.push(['PASS', name])
  } catch (e) {
    results.push(['FAIL', `${name}: ${e.message.split('\n')[0]}`])
  }
}

async function visible(page, text, ms = 8000) {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout: ms })
}
async function absent(page, text, ms = 1500) {
  await page.waitForTimeout(ms)
  if (await page.getByText(text, { exact: false }).first().isVisible().catch(() => false)) throw new Error(`"${text}" is showing`)
}

;(async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  await new Promise((r) => setTimeout(r, 2500))
  const browser = await chromium.launch()
  const fresh = async (setup) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()
    if (setup) await setup(ctx, page)
    return { ctx, page }
  }

  try {
    await check('first visit shows only the gate', async () => {
      const { ctx, page } = await fresh(async (c) => c.route(API, (r) => json(r, 500, {})))
      await page.goto(URL)
      await visible(page, GATE)
      await absent(page, APP, 500)
      await ctx.close()
    })

    await check('email link and code: request, then sign in', async () => {
      let otpReq = null
      const { ctx, page } = await fresh(async (c) => {
        await c.route(API, async (r) => {
          const u = r.request().url()
          if (u.includes('/auth/v1/otp')) {
            otpReq = { url: u, body: JSON.parse(r.request().postData() || '{}') }
            return json(r, 200, {})
          }
          if (u.includes('/auth/v1/verify')) return json(r, 200, session(now() + 3600))
          if (u.includes('/auth/v1/user')) return json(r, 200, USER)
          return json(r, 404, {})
        })
      })
      await page.goto(URL)
      await page.getByLabel('Email').fill('  Coach@Example.com ')
      await page.getByRole('button', { name: 'Email me a sign-in link' }).click()
      await visible(page, 'Check your email')
      if (otpReq.body.email !== 'coach@example.com') throw new Error('email not cleaned: ' + otpReq.body.email)
      if (otpReq.body.create_user === false) throw new Error('would not create new accounts')
      if (!decodeURIComponent(otpReq.url).includes(`redirect_to=${URL}`)) throw new Error('bad redirect: ' + otpReq.url)
      await page.getByLabel('Code from the email').fill('123456')
      await page.getByRole('button', { name: 'Sign in with code' }).click()
      await visible(page, APP)
      const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY)
      if (!stored?.refresh_token) throw new Error('session not kept on the device')
      await ctx.close()
    })

    await check('expired sign-in opens the app with no signal', async () => {
      const { ctx, page } = await fresh(async (c) => {
        await seed(c, session(now() - 86400))
        await c.route(API, (r) => r.abort('internetdisconnected'))
      })
      await page.goto(URL)
      await visible(page, APP)
      await absent(page, GATE, 2500)
      const kept = await page.evaluate((k) => !!localStorage.getItem(k), KEY)
      if (!kept) throw new Error('the stored sign-in was thrown away')
      await ctx.close()
    })

    await check('offline reload after a first online visit still opens', async () => {
      let offline = false
      const { ctx, page } = await fresh(async (c) => {
        // Stubbed requests are answered even in offline mode, so fail them like a dead connection.
        await c.route(API, (r) => (offline ? r.abort('internetdisconnected') : json(r, 404, {})))
      })
      await page.goto(URL)
      await visible(page, GATE)
      await page.evaluate(() => navigator.serviceWorker.ready)
      await page.reload()
      await page.waitForFunction(() => !!navigator.serviceWorker.controller)
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(session(now() - 3600))])
      offline = true
      await ctx.setOffline(true)
      await page.reload()
      await visible(page, APP)
      await ctx.close()
    })

    await check('offline with no sign-in explains and blocks sending', async () => {
      const { ctx, page } = await fresh()
      await page.goto(URL)
      await visible(page, GATE)
      await page.evaluate(() => navigator.serviceWorker.ready)
      await page.reload()
      await page.waitForFunction(() => !!navigator.serviceWorker.controller)
      await ctx.setOffline(true)
      await page.reload()
      await visible(page, "You're offline")
      await page.getByLabel('Email').fill('coach@example.com')
      if (!(await page.getByRole('button', { name: 'Email me a sign-in link' }).isDisabled())) throw new Error('send button should be disabled')
      await ctx.close()
    })

    await check('revoked refresh token sends the user back to the gate', async () => {
      const { ctx, page } = await fresh(async (c) => {
        await seed(c, session(now() - 86400))
        await c.route(API, (r) => json(r, 400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' }))
      })
      await page.goto(URL)
      await visible(page, GATE)
      await ctx.close()
    })

    await check('a made-up sign-in is rejected by the server', async () => {
      const { ctx, page } = await fresh(async (c) => {
        await seed(c, session(now() + 86400 * 300))
        await c.route(API, (r) => json(r, 401, { code: 401, error_code: 'bad_jwt', msg: 'invalid JWT' }))
      })
      await page.goto(URL)
      await visible(page, GATE)
      const kept = await page.evaluate((k) => !!localStorage.getItem(k), KEY)
      if (kept) throw new Error('fake session was kept')
      await ctx.close()
    })

    await check('a good sign-in stays in the app', async () => {
      const { ctx, page } = await fresh(async (c) => {
        await seed(c, session(now() + 3000))
        await c.route(API, (r) => json(r, 200, USER))
      })
      await page.goto(URL)
      await visible(page, APP)
      await absent(page, GATE, 1500)
      await ctx.close()
    })

    await check('opening the emailed link signs in and tidies the address', async () => {
      const exp = now() + 3600
      const { ctx, page } = await fresh(async (c) => {
        await c.route(API, (r) => json(r, 200, USER))
      })
      await page.goto(`${URL}#access_token=${jwt(exp)}&expires_in=3600&expires_at=${exp}&refresh_token=refresh-1&token_type=bearer&type=magiclink`)
      await visible(page, APP)
      const hash = await page.evaluate(() => location.hash)
      if (hash.includes('access_token')) throw new Error('token left in the address bar: ' + hash)
      await ctx.close()
    })

    await check('an expired link explains itself', async () => {
      const { ctx, page } = await fresh()
      await page.goto(`${URL}#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`)
      await visible(page, 'expired or was already used')
      const hash = await page.evaluate(() => location.hash)
      if (hash.includes('error')) throw new Error('error left in the address bar')
      await ctx.close()
    })
  } finally {
    await browser.close()
    server.kill()
  }

  for (const [r, n] of results) console.log(`${r}  ${n}`)
  if (results.some(([r]) => r === 'FAIL')) process.exit(1)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
