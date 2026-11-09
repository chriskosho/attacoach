// Drives the built app at phone width and saves screenshots. Usage: node scripts/walkthrough.cjs <outDir>
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright')
const { spawn } = require('child_process')

const out = process.argv[2] || 'screenshots'
const URL = 'http://localhost:4173/attacoach/'

;(async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' })
  await new Promise((r) => setTimeout(r, 2500))
  const browser = await chromium.launch()
  const errors = []
  try {
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme })
      const page = await ctx.newPage()
      page.on('pageerror', (e) => errors.push(e.message))
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
      const shot = (name) => page.screenshot({ path: `${out}/${scheme}-${name}.png`, fullPage: true })
      await page.goto(URL)
      await page.getByText('Set up your team').waitFor()
      await shot('01-welcome')
      await page.getByLabel('Team name').fill('Blue Jays')
      await page.getByRole('button', { name: '12U', exact: true }).click()
      await page.getByRole('button', { name: 'Next' }).click()
      await page.getByRole('button', { name: /A few seasons/ }).click()
      await shot('02-experience')
      await page.getByRole('button', { name: 'Next' }).click()
      await page.getByRole('button', { name: 'Base running' }).click()
      await page.getByRole('button', { name: 'Fielding ground balls' }).click()
      await page.getByRole('button', { name: 'Knowing where to throw' }).click()
      await shot('03-needs')
      await page.getByRole('button', { name: 'Next' }).click()
      await shot('04-rules')
      await page.getByRole('button', { name: 'Save and start planning' }).click()
      await page.getByText("Plan a practice").waitFor()
      await page.getByRole('button', { name: '90', exact: true }).click()
      await page.getByRole('button', { name: '3', exact: true }).click()
      await shot('05-today')
      await page.getByRole('button', { name: 'Build practice plan' }).click()
      await page.getByRole('list', { name: 'Practice blocks' }).waitFor()
      await shot('06-plan')
      const items = page.getByRole('list', { name: 'Practice blocks' }).getByRole('listitem')
      await items.nth(3).locator('.slot-head').first().click()
      await shot('07-plan-open')
      await page.getByRole('button', { name: 'Start practice' }).click()
      await page.getByRole('button', { name: 'Start' }).click()
      await page.waitForTimeout(1500)
      await shot('08-timer')
      await page.getByRole('button', { name: 'Next block' }).click()
      await page.getByRole('button', { name: 'Next block' }).click()
      await page.getByRole('button', { name: 'Next block' }).click()
      await shot('09-timer-stations')
      page.once('dialog', (d) => d.accept())
      await page.getByRole('button', { name: 'Exit' }).click()
      await page.getByRole('button', { name: 'Drills' }).click()
      await shot('10-drills')
      await page.locator('.drill-row').first().click()
      await shot('11-drill')
      await page.getByRole('button', { name: 'Team' }).click()
      await shot('12-team')
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
