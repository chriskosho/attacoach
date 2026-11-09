// Loads the built app, goes offline, reloads, and builds a plan. Usage: node scripts/check-offline.cjs
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright')
const { spawn } = require('child_process')

;(async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', '4174', '--strictPort'], { stdio: 'ignore' })
  await new Promise((r) => setTimeout(r, 2500))
  const browser = await chromium.launch()
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
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
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Pitching' }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Save and start planning' }).click()
    await page.getByRole('button', { name: 'Build practice plan' }).click()
    await page.getByRole('list', { name: 'Practice blocks' }).waitFor()
    const fontOk = await page.evaluate(() => document.fonts.load('700 20px "Barlow Condensed"').then((f) => f.length > 0 && f[0].status === 'loaded'))
    if (!fontOk) throw new Error('Display font did not load offline')
    console.log('Offline check passed: app loaded, team saved and plan built with no network.')
  } finally {
    await browser.close()
    server.kill()
  }
})().catch((e) => {
  console.error('Offline check FAILED:', e.message)
  process.exit(1)
})
