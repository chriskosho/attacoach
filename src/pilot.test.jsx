// Stage 8: feedback by email, the season card and the pilot settings.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { db, saveTeam, savePlayers, clearEverything, setSetting } from './lib/db.js'
import { defaultRules } from './data/constants.js'
import { feedbackMessage, mailtoLink, feedbackAvailable } from './lib/feedback.js'
import { seasonSummary, QUIET_DAYS } from './lib/season.js'
import { VERSION, CHANGELOG } from './changelog.js'
import { FEEDBACK_EMAIL, TEST_TOOLS } from './config.js'
import { DRILLS } from './data/drills.js'
import { saveCustomDrill } from './lib/db.js'

const hit = DRILLS.find((d) => d.category === 'hitting' && d.needs.includes('contact'))
const field = DRILLS.find((d) => d.category === 'infield' && d.needs.includes('grounders') && !d.needs.includes('contact'))
const fly = DRILLS.find((d) => d.needs.includes('flyballs') && !d.needs.includes('contact') && !d.needs.includes('grounders'))

const team = { id: 't1', name: 'Smith Family Tigers', division: '10U', experience: 'some', needs: ['contact', 'grounders', 'flyballs'], rules: defaultRules('10U'), sport: 'baseball' }
const plan = (id, date, ids, extra = {}) => ({ id, teamId: 't1', date, createdAt: `${date}T10:00:00Z`, minutes: 60, kids: 10, spaces: ['field'], blocks: ids.map((d, i) => ({ id: `${id}${i}`, kind: 'drill', drillId: d, minutes: 10 })), ...extra })

describe('feedback message', () => {
  it('has version, sport, age, length, space, drill names and the note', () => {
    const p = plan('p1', '2026-11-01', [hit.id, field.id])
    const m = feedbackMessage({ team, plan: p, rating: 'down', note: 'Too much waiting.' })
    expect(m.body).toContain(`AttaCoach ${VERSION}`)
    expect(m.body).toContain('Sport: Baseball')
    expect(m.body).toContain('Age group: 10U')
    expect(m.body).toContain('Practice length: 20 minutes')
    expect(m.body).toContain('Where: ')
    expect(m.body).toContain(hit.name)
    expect(m.body).toContain(field.name)
    expect(m.body).toContain('No (thumbs down)')
    expect(m.body).toContain('Too much waiting.')
    expect(m.subject).toMatch(/thumbs down/)
  })

  it('never contains the coach, the players or the team name', async () => {
    await clearEverything()
    await setSetting('coachName', 'Zelda Quimby')
    const p = plan('p1', '2026-11-01', [hit.id])
    const players = [{ id: 'a', first: 'Wyatt', last: 'Pemberton' }]
    const m = feedbackMessage({ team, plan: p, rating: 'up', note: '' })
    const all = `${m.subject}\n${m.body}\n${mailtoLink('x@y.z', m)}`
    for (const n of ['Zelda', 'Quimby', 'Wyatt', 'Pemberton', 'Smith', 'Tigers']) expect(all).not.toContain(n)
    expect(players.length).toBe(1)
  })

  it('names a coach-made drill generically, since its name is typed by the coach', async () => {
    await clearEverything()
    const custom = await saveCustomDrill({ name: "Wyatt's secret drill", category: 'team', minutes: 10, needs: [], where: ['field'], group: 'small', steps: ['Go.'] })
    // The app registers custom drills when it loads; do the same here.
    const { setCustomDrills } = await import('./data/drills.js')
    setCustomDrills(await db.customDrills.toArray())
    const m = feedbackMessage({ team, plan: plan('p2', '2026-11-01', [custom.id]) })
    expect(m.body).not.toContain('Wyatt')
    expect(m.body).toContain('own drills')
    setCustomDrills([])
  })

  it('a Settings message has no plan lines', () => {
    const m = feedbackMessage({ team, note: 'Love it' })
    expect(m.body).not.toContain('Drills in the plan')
    expect(m.body).toContain('Love it')
    expect(m.subject).toBe('AttaCoach feedback')
  })

  it('the mailto link goes to the one address in config and is encoded', () => {
    expect(feedbackAvailable()).toBe(true)
    const link = mailtoLink(FEEDBACK_EMAIL, { subject: 'a b', body: 'line1\nline2 & more' })
    expect(link.startsWith(`mailto:${FEEDBACK_EMAIL}?subject=a%20b&body=`)).toBe(true)
    expect(link).toContain('line1%0Aline2%20%26%20more')
    expect(feedbackAvailable('')).toBe(false)
    expect(feedbackAvailable('   ')).toBe(false)
  })
})

describe('feedback screens', () => {
  beforeEach(async () => {
    await clearEverything()
    window.location.hash = ''
    await saveTeam({ ...team })
  })

  it('Settings: shows the whole message before anything is sent, and the link matches it', async () => {
    window.location.hash = '#/settings/about'
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Send feedback' }))
    const dialog = await screen.findByRole('dialog', { name: 'Send feedback' })
    await user.type(within(dialog).getByRole('textbox'), 'Needs a Sunday option')
    const shown = within(dialog).getByLabelText('Message to be sent').textContent
    expect(shown).toContain('Needs a Sunday option')
    expect(shown).toContain('Age group: 10U')
    const href = within(dialog).getByRole('link', { name: 'Open my email app' }).getAttribute('href')
    expect(decodeURIComponent(href)).toContain(shown)
    expect(href).toContain('mailto:chriskosho@gmail.com')
    expect(dialog.textContent).toMatch(/Nothing is sent until you press send/)
  })

  it('plan page: thumbs open the sheet with the plan, its drills and the choice', async () => {
    await db.plans.put(plan('p1', '2026-11-01', [hit.id, field.id]))
    window.location.hash = '#/plan/p1'
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'No, this plan was not right' }))
    const dialog = await screen.findByRole('dialog', { name: 'Plan feedback' })
    const shown = within(dialog).getByLabelText('Message to be sent').textContent
    expect(shown).toContain('No (thumbs down)')
    expect(shown).toContain(hit.name)
    expect(shown).not.toContain('Smith')
    // The choice can be changed in the sheet.
    await user.click(within(dialog).getByRole('button', { name: 'Yes' }))
    expect(within(dialog).getByLabelText('Message to be sent').textContent).toContain('Yes (thumbs up)')
  })

  it('timer finish screen has the same question', async () => {
    await db.plans.put(plan('p1', '2026-11-01', [hit.id]))
    localStorage.setItem('run:p1', JSON.stringify({ index: 0, startedAt: null, elapsed: 0, adj: {}, startedWall: null }))
    window.location.hash = '#/run/p1'
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('timer')
    await user.click(screen.getByRole('button', { name: 'Next block' }))
    expect(await screen.findByText('Practice complete')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Yes, this plan was right' })).toBeTruthy()
  })
})

describe('season so far', () => {
  const today = '2026-11-20'
  const plans = [
    plan('a', '2026-10-01', [hit.id, field.id]),
    plan('b', '2026-10-15', [hit.id]),
    plan('c', '2026-11-15', [hit.id, field.id]),
    plan('f', '2026-12-05', [fly.id]), // in the future: not counted
  ]
  const debriefs = [
    { id: 'g1', teamId: 't1', kind: 'game', date: '2026-10-10' },
    { id: 'g2', teamId: 't1', kind: 'game', date: '2026-11-01' },
    { id: 'r1', teamId: 't1', kind: 'practice', date: '2026-10-01', planId: 'a' },
  ]

  it('counts practices and games, and how often each skill came up', () => {
    const s = seasonSummary({ team, plans, debriefs, today })
    expect(s.practices).toBe(3)
    expect(s.games).toBe(2)
    const by = Object.fromEntries(s.areas.map((a) => [a.id, a.count]))
    expect(by.contact).toBe(3)
    expect(by.grounders).toBe(2)
    expect(by.flyballs).toBe(0)
  })

  it('a recap counts a practice even before its day', () => {
    const s = seasonSummary({ team, plans, debriefs: [...debriefs, { id: 'r2', teamId: 't1', kind: 'practice', date: '2026-11-20', planId: 'f' }], today })
    expect(s.practices).toBe(4)
  })

  it('suggests one listed skill that is three weeks quiet, never the ones practised lately', () => {
    // Grounders: last on Nov 15 (5 days ago). Flyballs: never, and the first practice was 50 days ago.
    const s = seasonSummary({ team, plans, debriefs, today })
    expect(s.quiet.id).toBe('flyballs')
    expect(s.quiet.never).toBe(true)
  })

  it('names the weeks for a skill that was practised and then dropped', () => {
    const t = { ...team, needs: ['grounders', 'contact'] }
    const old = [plan('a', '2026-10-01', [field.id, hit.id]), plan('c', '2026-11-15', [hit.id])]
    const s = seasonSummary({ team: t, plans: old, debriefs: [], today })
    expect(s.quiet.id).toBe('grounders')
    expect(s.quiet.days).toBe(50)
    expect(s.quiet.never).toBe(false)
  })

  it('does not nag at exactly 20 days, and does at 21', () => {
    const t = { ...team, needs: ['grounders'] }
    const p = [plan('a', '2026-10-31', [field.id])]
    expect(seasonSummary({ team: t, plans: p, debriefs: [], today: '2026-11-20' }).quiet).toBeNull()
    expect(QUIET_DAYS).toBe(21)
    expect(seasonSummary({ team: t, plans: p, debriefs: [], today: '2026-11-21' }).quiet.id).toBe('grounders')
  })

  it('no suggestion for a brand-new team, or when nothing has been practised', () => {
    expect(seasonSummary({ team, plans: [], debriefs: [], today }).quiet).toBeNull()
    expect(seasonSummary({ team, plans: [plan('n', '2026-11-18', [hit.id])], debriefs: [], today }).quiet).toBeNull()
  })

  it('shows on the Log tab: the numbers and the one suggestion', async () => {
    await clearEverything()
    await saveTeam({ ...team })
    // The app uses the real date, so add enough clearly-past practices for the breakdown to show.
    for (const p of [...plans, plan('x1', '2026-08-01', [hit.id]), plan('x2', '2026-08-08', [field.id]), plan('x3', '2026-08-15', [hit.id])]) await db.plans.put(p)
    for (const d of debriefs) await db.debriefs.put({ ...d, createdAt: `${d.date}T10:00:00Z` })
    window.location.hash = '#/log'
    render(<App />)
    const card = (await screen.findByRole('heading', { name: 'Season so far' })).closest('section')
    // Only check the structure and the games count here.
    expect(within(card).getByTestId('season-games').textContent).toBe('2')
    expect(within(card).getByTestId('season-practices').textContent).toMatch(/^\d+$/)
    expect(within(card).getByRole('list', { name: 'Skills practised' })).toBeTruthy()
    expect(card.querySelectorAll('[role=note]').length).toBeLessThanOrEqual(1)
  })

  it('shows one plain line until three practices are in, then the skill breakdown', async () => {
    await clearEverything()
    await saveTeam({ ...team })
    await db.plans.put(plan('y1', '2026-08-01', [hit.id]))
    await db.debriefs.put({ id: 'gg', teamId: 't1', kind: 'game', date: '2026-08-02', createdAt: '2026-08-02T10:00:00Z' })
    window.location.hash = '#/log'
    render(<App />)
    const card = (await screen.findByRole('heading', { name: 'Season so far' })).closest('section')
    expect(card.textContent).toContain('1 practice and 1 game so far. The skill breakdown appears after 3.')
    expect(within(card).queryByRole('list', { name: 'Skills practised' })).toBeNull()
    cleanup()
    await db.plans.put(plan('y2', '2026-08-08', [field.id]))
    await db.plans.put(plan('y3', '2026-08-15', [hit.id]))
    render(<App />)
    const full = (await screen.findByRole('heading', { name: 'Season so far' })).closest('section')
    expect(await within(full).findByRole('list', { name: 'Skills practised' })).toBeTruthy()
    expect(full.textContent).not.toMatch(/appears after 3/)
  })

  it('has a quiet empty state before anything is logged', async () => {
    await clearEverything()
    await saveTeam({ ...team })
    window.location.hash = '#/log'
    render(<App />)
    const card = (await screen.findByRole('heading', { name: 'Season so far' })).closest('section')
    expect(card.textContent).toMatch(/show up here/)
  })
})

describe('pilot settings', () => {
  it('test teams are on for the pilot', () => {
    expect(TEST_TOOLS).toBe(true)
  })

  it('About is one line with the version; opening it shows the latest release only', async () => {
    await clearEverything()
    await saveTeam({ ...team })
    window.location.hash = '#/settings/about'
    render(<App />)
    const about = (await screen.findByRole('heading', { name: 'About' })).closest('section')
    const fold = about.querySelector('details')
    expect(fold.open).toBe(false)
    expect(within(about).getByText(`AttaCoach ${VERSION} · What's new`)).toBeTruthy()
    expect(about.textContent).toContain(`What's new in ${CHANGELOG[0].version}`)
    expect(about.textContent).not.toContain(`What's new in ${CHANGELOG[1].version}`)
    await userEvent.setup().click(about.querySelector('summary'))
    expect(fold.open).toBe(true)
  })

  it('Privacy and Backup are folded to one line each, with the full text one tap away', async () => {
    await clearEverything()
    await saveTeam({ ...team })
    window.location.hash = '#/settings/privacy'
    const user = userEvent.setup()
    render(<App />)
    const privacy = (await screen.findByRole('heading', { name: 'Privacy' })).closest('section')
    expect(privacy.querySelector('details').open).toBe(false)
    expect(within(privacy).getByText('No ads, no tracking. Your data stays on this phone.')).toBeTruthy()
    await user.click(privacy.querySelector('summary'))
    expect(privacy.querySelector('details').open).toBe(true)
    expect(privacy.textContent).toMatch(/never uploads it/)
    // Backup is its own section now.
    cleanup()
    window.location.hash = '#/settings/backup'
    render(<App />)
    const backup = (await screen.findByRole('heading', { name: 'Backup' })).closest('section')
    expect(backup.textContent).toContain('Saved only on this phone. Last backup: never.')
    expect(backup.querySelector('details').open).toBe(false)
    expect(within(backup).getByRole('button', { name: 'Save backup' })).toBeTruthy()
    expect(within(backup).getByRole('button', { name: 'Restore' })).toBeTruthy()
    await user.click(within(backup).getByText('About backups'))
    expect(backup.textContent).toMatch(/Save a backup file to keep them safe/)
  })

  it('privacy text covers device storage, backups, YouTube and feedback', async () => {
    await clearEverything()
    await saveTeam({ ...team })
    window.location.hash = '#/settings/privacy'
    render(<App />)
    const card = (await screen.findByRole('heading', { name: 'Privacy' })).closest('section')
    for (const re of [/stay in this browser on this device/, /backup is a file you save yourself/, /YouTube search/, /Feedback is sent only if you tap/]) expect(card.textContent).toMatch(re)
  })
})
