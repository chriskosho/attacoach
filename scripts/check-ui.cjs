// Walks the main screens at 390x844 and 320x568 in light, dark and high contrast. For each screen it
// counts tappable things shorter than 44 px and text that misses the contrast target (4.5:1, or 3:1 for
// large text), saves a screenshot, and writes a JSON report. Exits 1 if anything fails.
// Usage: node scripts/check-ui.cjs [outDir] [label] [--no-fail]   (PLAYWRIGHT_PATH needed; run `npm run build` first)
const { chromium } = require(process.env.PLAYWRIGHT_PATH)
const { spawn } = require('child_process'); const fs = require('fs')
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const out = args[0] || 'screenshots/ui'; const label = args[1] || 'now'; const noFail = process.argv.includes('--no-fail')
fs.mkdirSync(out, { recursive: true })
const SIZES = [[390, 844], [320, 568]]
const LOOKS = [['light', 'light', 0], ['dark', 'dark', 0], ['hc', 'light', 1]]
const results = []
const PAGE_CHECK = () => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' }
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 } }
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 })
  const bgOf = (e) => { const chain = []; for (let n = e; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { chain.push(c); if (c.a >= 1) break } } let base = { r: 255, g: 255, b: 255, a: 1 }; for (let i = chain.length - 1; i >= 0; i--) base = over(chain[i], base); return base }
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b) }
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  const name = (e) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : ''} "${(e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 28).replace(/\n/g, ' ')}"`
  // Tappable: buttons, links, summaries, inputs, selects. Inline links inside a sentence are skipped.
  const small = []
  for (const e of document.querySelectorAll('button, a[href], summary, select, input:not([type=hidden]):not([type=file]), [role=button]')) {
    if (!vis(e)) continue
    if (e.closest('.sr-only')) continue
    const r = e.getBoundingClientRect(); const inTabs = !!e.closest('.tabs')
    if (e.matches('input.switch') ) continue // the whole toggle row is the target
    if (Math.round(r.height) < 44 && !inTabs) small.push(`${name(e)} ${Math.round(r.height)}px`)
  }
  // Text contrast
  const low = []; let checked = 0
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const seen = new Set()
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (!t.textContent.trim()) continue
    const e = t.parentElement; if (!e || seen.has(e) || !vis(e) || e.closest('script,style,.sr-only')) continue
    seen.add(e)
    const s = getComputedStyle(e); if (e.closest('button:disabled, [disabled]') || parseFloat(s.opacity) < 1 && false) continue
    const fg0 = parse(s.color); if (!fg0) continue
    const bg = bgOf(e); const fg = over(fg0, bg)
    const px = parseFloat(s.fontSize); const bold = parseInt(s.fontWeight, 10) >= 700
    const large = px >= 24 || (px >= 18.66 && bold)
    const need = large ? 3 : 4.5; const got = ratio(fg, bg); checked++
    if (got + 0.005 < need) low.push(`${name(e)} ${got.toFixed(2)} (needs ${need})`)
  }
  return { small, low, checked, vh: innerHeight }
}
;(async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { cwd: process.env.APP_DIR || process.cwd(), stdio: 'ignore' })
  await new Promise((r) => setTimeout(r, 2500))
  const b = await chromium.launch(); const base = 'http://localhost:4173/attacoach/'
  try {
    for (const [w, h] of SIZES) for (const [look, scheme, hc] of LOOKS) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: scheme })
      const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('PAGEERROR', e.message)); p.on('dialog', (d) => d.dismiss())
      const tag = `${label}-${w}x${h}-${look}`
      const check = async (name, full = false) => {
        await p.waitForTimeout(400)
        await p.screenshot({ path: `${out}/${tag}-${name}.png`, fullPage: full })
        results.push({ tag, name, ...(await p.evaluate(PAGE_CHECK)) })
      }
      await p.goto(base); await p.getByText('Set up your team').waitFor()
      await p.getByText('Ready-made test teams').click()
      await p.getByRole('button', { name: /Rec team, full roster \(10U\)/ }).click(); await p.waitForTimeout(1500)
      if (hc) { await p.goto(base + '#/settings/display'); await p.getByRole('button', { name: /High contrast/ }).click() }
      await p.goto(base + '#/today'); await p.waitForTimeout(500); await check('1-today')
      await p.getByText("Change today's setup").first().click().catch(() => {}); await check('1b-today-setup-open')
      await p.goto(base + '#/today')
      await p.getByRole('button', { name: 'Open plan' }).first().click(); await p.waitForTimeout(600); await check('2-plan')
      await p.getByRole('button', { name: 'Change of plans' }).click(); await p.waitForTimeout(400); await check('2b-change-of-plans')
      // Apply changes stays in view at the bottom of the sheet without scrolling.
      const ap = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Apply changes'); if (!b) return null; const r = b.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight } })
      results.push({ tag, name: '2b-apply-visible', small: !ap || ap.top < 0 || ap.bottom > ap.vh ? [`Apply changes is not fully in view (${ap ? Math.round(ap.top) + '-' + Math.round(ap.bottom) + ' of ' + ap.vh : 'missing'})`] : [], low: [], checked: 1 })
      await p.keyboard.press('Escape'); await p.goBack().catch(() => {}); await p.goto(base + '#/debrief/practice'); await check('3-recap', true)
      await p.goto(base + '#/coach'); await check('4-coach')
      await p.goto(base + '#/settings'); await check('5-settings')
      await p.goto(base + '#/settings/backup'); await check('5b-settings-backup')
      await p.goto(base + '#/team'); await check('6-team')
      await p.goto(base + '#/log'); await check('7-log')
      await p.goto(base + '#/drills'); await check('8-drills')
      await p.goto(base + '#/today'); await p.getByRole('button', { name: 'Start practice' }).first().click(); await p.getByRole('timer').waitFor(); await check('9-timer')
      for (let i = 0; i < 8; i++) { if (await p.getByText(/Rotation 1 of/).count()) break; await p.getByRole('button', { name: 'Next block' }).click(); await p.waitForTimeout(120) }
      await check('9b-timer-stations')
      // "Save and start planning" fits on one line (setup for a new team, last step).
      await p.goto(base + '#/setup/new'); await p.waitForTimeout(500)
      await p.getByLabel('Team name').fill('Check'); await p.getByRole('button', { name: 'Baseball' }).click(); await p.getByRole('button', { name: '10U', exact: true }).click()
      for (let i = 0; i < 8; i++) {
        const save = p.getByRole('button', { name: 'Save and start planning' })
        if (await save.count()) break
        const nxt = p.getByRole('button', { name: /^(Next|Skip for now)$/ }).first(); if (!(await nxt.count())) break
        if (!(await nxt.isEnabled())) { const first = p.getByRole('button', { name: /New to coaching|A few seasons/ }).first(); if (await first.count()) await first.click() }
        await nxt.click(); await p.waitForTimeout(250)
      }
      const save = p.getByRole('button', { name: 'Save and start planning' })
      if (await save.count()) {
        await check('10-setup-last-step')
        const lines = await save.evaluate((b) => { const r = document.createRange(); r.selectNodeContents(b); return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size })
        results.push({ tag, name: '10-save-one-line', small: lines > 1 ? [`"Save and start planning" wraps onto ${lines} lines`] : [], low: [], checked: 1 })
      } else results.push({ tag, name: '10-save-one-line', small: ['could not reach the last setup step'], low: [], checked: 0 })
      await ctx.close()
    }
    const sum = (k) => results.reduce((n, r) => n + r[k].length, 0)
    const lines = []
    for (const r of results) { for (const s of r.small) lines.push(`${r.tag} ${r.name}: tap ${s}`); for (const l of r.low) lines.push(`${r.tag} ${r.name}: contrast ${l}`) }
    fs.writeFileSync(`${out}/${label}-ui-report.json`, JSON.stringify(results, null, 1))
    const uniq = [...new Set(lines.map((l) => l.replace(/^\S+ /, '')))]
    fs.writeFileSync(`${out}/${label}-ui-failures.txt`, lines.join('\n'))
    console.log(`UI check: ${results.length} screens, ${results.reduce((n, r) => n + r.checked, 0)} text items checked. Tap targets under 44 px: ${sum('small')}. Low contrast: ${sum('low')}. (${uniq.length} distinct)`)
    if ((sum('small') || sum('low')) && !noFail) process.exitCode = 1
  } finally { await b.close(); server.kill() }
})().catch((e) => { console.log('ERR', e.message.split('\n')[0]); process.exit(1) })
