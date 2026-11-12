// Checks the practice timer's layout at 390x844, 390x667 and 320x568 in light, dark and high contrast.
// For a single drill the clock, Say line, Next line and all three buttons must sit inside the screen; for
// stations the Next line, buttons and every group row must (also when running late). Usage: node scripts/check-timer-layout.cjs [outDir] [label]
// (saves a screenshot of each state and a measurements file; exits 1 if anything is outside the screen).
const { chromium } = require(process.env.PLAYWRIGHT_PATH)
const { spawn } = require('child_process'); const fs = require('fs')
const out = process.argv[2] || 'screenshots/timer'
const label = process.argv[3] || 'now'
fs.mkdirSync(out, { recursive: true })
const SIZES = [[390, 844], [390, 667], [320, 568]]
const LOOKS = [['light', 'light', 0], ['dark', 'dark', 0], ['hc', 'light', 1]]
const results = []
;(async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { cwd: process.env.APP_DIR || process.cwd(), stdio: 'ignore' })
  await new Promise((r) => setTimeout(r, 2500))
  const b = await chromium.launch()
  try {
    for (const [w, h] of SIZES) for (const [look, scheme, hc] of LOOKS) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: scheme })
      const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('PAGEERROR', e.message))
      const tag = `${label}-${w}x${h}-${look}`
      const measure = async (name) => {
        await p.waitForTimeout(350)
        await p.screenshot({ path: `${out}/${tag}-${name}.png` })
        const m = await p.evaluate(() => {
          const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const q = e.getBoundingClientRect(); return { top: Math.round(q.top), bottom: Math.round(q.bottom) } }
          const btns = [...document.querySelectorAll('.run-controls button')].map((e) => Math.round(e.getBoundingClientRect().bottom))
          const text = (document.querySelector('.run') || document.body).innerText.trim().split(/\s+/).length
          // Group rows sit in a scrolling area, so a row is only seen if it ends above that area's bottom edge.
          const body = document.querySelector('.run-body')?.getBoundingClientRect()
          const groups = [...document.querySelectorAll('.run-station')].map((e) => Math.round(e.getBoundingClientRect().bottom))
          return { vh: innerHeight, clock: r('.clock'), cue: r('.run-cue'), next: r('.run-next'), btnBottom: Math.max(...btns), groups: groups.length, groupBottom: groups.length ? Math.max(...groups) : null, bodyBottom: body ? Math.round(body.bottom) : null, words: text }
        })
        results.push({ tag, name, ...m })
      }
      await p.goto('http://localhost:4173/attacoach/'); await p.getByText('Set up your team').waitFor()
      if (hc) { await p.evaluate(() => {}) }
      await p.getByText('Ready-made test teams').click()
      await p.getByRole('button', { name: /Rec team, full roster \(10U\)/ }).click(); await p.waitForTimeout(1500)
      if (hc) { await p.goto('http://localhost:4173/attacoach/#/settings'); await p.getByRole('button', { name: /High contrast/ }).click() }
      await p.goto('http://localhost:4173/attacoach/#/today'); await p.waitForTimeout(500)
      await p.getByRole('button', { name: 'Start practice' }).first().click(); await p.getByRole('timer').waitFor()
      await measure('1-before-start')
      await p.getByRole('button', { name: 'Start' }).click(); await p.waitForTimeout(800); await measure('2-running')
      for (let i = 0; i < 6; i++) { if (await p.getByText(/Rotation 1 of/).count()) break; await p.getByRole('button', { name: 'Next block' }).click(); await p.waitForTimeout(150) }
      await measure('3-stations')
      const row = p.locator('.run-station-head').first(); if (await row.count()) { await row.click(); await measure('4-station-open'); await row.click() }
      await p.evaluate(() => { for (const k of Object.keys(localStorage)) { if (!k.startsWith('run:')) continue; const v = JSON.parse(localStorage.getItem(k)); v.startedWall = Date.now() - 60 * 60 * 1000; localStorage.setItem(k, JSON.stringify(v)) } })
      await p.reload(); await p.getByRole('timer').waitFor(); await p.waitForTimeout(600); await measure('5-late')
      const trimBtn = p.getByRole('button', { name: /^Trim/ }); if (await trimBtn.count()) { await trimBtn.click(); await measure('6-late-trimmed') }
      await ctx.close()
    }
    const bad = []
    for (const r of results) {
      const single = r.name === '1-before-start' || r.name === '2-running'
      const need = single ? { clock: r.clock?.bottom, cue: r.cue?.bottom, next: r.next?.bottom, buttons: r.btnBottom } : { next: r.next?.bottom, buttons: r.btnBottom }
      // Every group row of a station block, on time and late (an opened station may push the rest down).
      // Checked on short screens (under 720 px tall), which get the compact station layout.
      if (['3-stations', '5-late', '6-late-trimmed'].includes(r.name) && r.vh < 720) need.groups = r.groups ? r.groupBottom : null
      for (const [k, v] of Object.entries(need)) {
        const edge = k === 'groups' ? Math.min(r.vh, r.bodyBottom ?? r.vh) : r.vh
        if (v == null || v > edge) bad.push(`${r.tag} ${r.name}: ${k} ${v} is outside the ${edge}px visible area`)
      }
    }
    console.log(bad.length ? bad.join('\n') : `Timer layout OK: ${results.length} states, nothing important outside the screen.`)
    if (bad.length) process.exitCode = 1
  } finally { fs.writeFileSync(`${out}/${label}-measure.json`, JSON.stringify(results, null, 1)); await b.close(); server.kill() }
})().catch((e) => { console.log('ERR', e.message.split('\n')[0]); process.exit(1) })
