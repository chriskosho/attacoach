import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { VERSION, CHANGELOG } from './changelog.js'

const css = fs.readFileSync('src/styles.css', 'utf8')
const src = (f) => fs.readFileSync(`src/components/${f}`, 'utf8')

describe('Stage 12F: one clear top, one filled action', () => {
  it('has a plain changelog entry for this version', () => {
    expect(CHANGELOG[0].version).toBe(VERSION)
    expect(VERSION).toBe('1.36.0')
  })

  it('Today: only the next practice card is raised, with a larger headline', () => {
    expect(css).toMatch(/\.next-card \{ box-shadow/)
    expect(css).toMatch(/\.next-card h2 \{ font-size: 40px/)
    expect(css).toMatch(/\.browse-row \{ background: none; border: 0/)
    expect(css).toMatch(/\.card\.safety-card \{ background: none; border: 0/)
  })

  it('Today: Open plan, Plan another practice and Not now are links', () => {
    const t = src('Today.jsx')
    expect(t).toMatch(/className="link-btn" onClick=\{\(\) => go\(`plan\/\$\{upcoming\.id\}`\)\}/)
    expect(t).toMatch(/link-btn plan-another/)
    const s = src('SafetyCards.jsx')
    expect(s).not.toMatch(/btn quiet|btn ghost/)
  })

  it('other secondary choices are links too', () => {
    const p = src('PlanView.jsx')
    for (const label of ['Change of plans', 'Add a drill', 'Share', 'Print', 'Save as a template']) {
      const m = new RegExp(`className="link-btn"[^\\n]*\\n\\s*${label}\\n`).test(p)
      expect(m, label).toBe(true)
    }
    expect(src('Setup.jsx')).toMatch(/className="link-btn" onClick=\{\(\) => setStep\(step - 1\)\}/)
  })

  it('plan header: the adults line sits inside "Date, template"', () => {
    const p = src('PlanView.jsx')
    const sub = p.slice(p.indexOf('className="plan-sub"'), p.indexOf('className="plan-sub"') + 1200)
    expect(sub.indexOf('Date, template')).toBeLessThan(sub.indexOf('adultsLine(plan)'))
    expect(sub.indexOf('</details>')).toBeGreaterThan(sub.indexOf('adultsLine(plan)'))
  })

  it('timer: the drill leads, the arrow and repeated group title are gone', () => {
    const r = src('RunTimer.jsx')
    expect(r).not.toMatch(/\)\} → \{sd\?\.name\}/)
    expect(r).toMatch(/sr-only">Group \{g \+ 1\}: /)
  })

  it('one card-title style, neutral level colors, darker helper text', () => {
    expect(css).toMatch(/\.card-title, \.browse-row strong, \.settings-row-text strong, \.safety-card > strong \{ font-family: var\(--display\)/)
    expect(css).toMatch(/\.level\.beginner, \.level\.intermediate, \.level\.advanced \{ color: var\(--ink-2\)/)
    expect(css).toMatch(/--ink-2: #3d4e44/)
  })

  it('Log hides the season card until there is something to total', () => {
    const l = src('Log.jsx')
    expect(l).toMatch(/if \(s\.practices === 0 && s\.games === 0\) return null/)
    expect(l).toMatch(/card empty left/)
  })
})
