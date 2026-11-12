// Stage 9A: restore and high contrast from the first screen, richer restore preview, the iOS backup line,
// and the template-name sheet.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { db, saveTeam, clearEverything, exportBackup, describeBackup, getSetting, saveCustomDrill, saveTemplate } from './lib/db.js'
import { backupWhere, isIOS } from './lib/backupFile.js'
import { defaultRules } from './data/constants.js'
import { buildPlan } from './lib/plan.js'

const team = { id: 't1', name: 'Hawks', division: '10U', experience: 'some', needs: ['contact'], rules: defaultRules('10U'), sport: 'baseball', favorites: ['a', 'b'], hidden: ['c'] }

async function backupOfRichTeam() {
  await clearEverything()
  const t = await saveTeam({ ...team })
  const plan = buildPlan(t, { minutes: 60, adults: 2, kids: 10, seed: 3, date: '2026-11-01' })
  await db.plans.put(plan)
  await saveCustomDrill({ name: 'My own drill', category: 'hitting', minutes: 8, needs: ['contact'], spaces: ['field'], steps: ['Swing'] })
  await saveTemplate(plan, 'Tuesday basics')
  const data = await exportBackup()
  await clearEverything()
  return new File([JSON.stringify(data)], 'backup.json', { type: 'application/json' })
}

describe('first screen', () => {
  beforeEach(async () => {
    await clearEverything()
    window.location.hash = ''
    delete document.documentElement.dataset.theme
  })

  it('restores a backup without setting up a team', async () => {
    const user = userEvent.setup()
    const file = await backupOfRichTeam()
    render(<App />)
    await screen.findByText('Set up your team')
    expect(screen.getByRole('button', { name: 'Restore a backup' })).toBeTruthy()
    await user.upload(screen.getByLabelText('Backup file'), file)
    const sheet = await screen.findByRole('dialog', { name: 'Restore this backup?' })
    await user.click(within(sheet).getByRole('button', { name: 'Restore' }))
    await waitFor(async () => expect(await db.teams.count()).toBe(1))
    await waitFor(() => expect(screen.queryByText('Set up your team')).toBe(null))
  })

  it('says so when the file is not a backup', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Set up your team')
    await user.upload(screen.getByLabelText('Backup file'), new File(['{"hello":1}'], 'x.json', { type: 'application/json' }))
    expect((await screen.findByRole('status')).textContent).toMatch(/not an AttaCoach backup/)
    expect(await db.teams.count()).toBe(0)
  })

  it('switches high contrast on and back off with one tap', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Set up your team')
    await user.click(screen.getByRole('button', { name: 'High contrast (bright sun)' }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('sun'))
    expect(await getSetting('theme')).toBe('sun')
    await user.click(await screen.findByRole('button', { name: 'Normal colors' }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBeUndefined())
  })
})

describe('restore preview counts', () => {
  it('lists own drills, templates, favorites and hidden drills', async () => {
    const file = await backupOfRichTeam()
    const info = await describeBackup(JSON.parse(await file.text()))
    expect(info.customDrills).toBe(1)
    expect(info.templates).toBe(1)
    expect(info.favorites).toBe(2)
    expect(info.hidden).toBe(1)
  })

  it('shows them in the sheet on Settings', async () => {
    const user = userEvent.setup()
    const file = await backupOfRichTeam()
    await saveTeam({ id: 'other', name: 'Other', division: '8U', experience: 'some', needs: [], rules: defaultRules('8U'), sport: 'baseball' })
    window.location.hash = '#/settings'
    render(<App />)
    await screen.findByText('Backup')
    await user.upload(screen.getByLabelText('Backup file'), file)
    const text = (await screen.findByRole('dialog', { name: 'Restore this backup?' })).textContent
    expect(text).toMatch(/1 drill of your own/)
    expect(text).toMatch(/1 template/)
    expect(text).toMatch(/2 favorite drills/)
    expect(text).toMatch(/1 hidden drill/)
  })
})

describe('where the backup went', () => {
  it('names Files on an iPhone and iPad', () => {
    expect(isIOS('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5)).toBe(true)
    expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true)
    expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false)
    expect(isIOS('Mozilla/5.0 (Linux; Android 14)', 5)).toBe(false)
    expect(backupWhere(true)).toMatch(/Files > Downloads.*Save to Files/)
  })

  it('gives a generic line elsewhere and promises nothing', () => {
    const line = backupWhere(false)
    expect(line).toMatch(/Downloads folder/)
    expect(line).not.toMatch(/Files >/)
  })

  it('shows the line after Save backup in Settings', async () => {
    const user = userEvent.setup()
    await clearEverything()
    await saveTeam({ ...team })
    window.location.hash = '#/settings'
    render(<App />)
    await screen.findByText('Backup')
    global.URL.createObjectURL = () => 'blob:x'
    global.URL.revokeObjectURL = () => {}
    await user.click(screen.getByRole('button', { name: 'Save backup' }))
    await waitFor(() => expect(screen.getAllByRole('status').map((n) => n.textContent).join(' ')).toMatch(/Saved a backup of 1 team.*Downloads/))
  })
})

describe('template name sheet', () => {
  beforeEach(async () => {
    await clearEverything()
  })

  async function openPlan() {
    const t = await saveTeam({ ...team })
    const plan = buildPlan(t, { minutes: 60, adults: 2, kids: 10, seed: 5, date: '2026-11-01' })
    await db.plans.put(plan)
    window.location.hash = `#/plan/${plan.id}`
    render(<App />)
    await screen.findByRole('list', { name: 'Practice blocks' })
    return plan
  }

  it('does not use window.prompt, starts with a name, and saves the typed one', async () => {
    const user = userEvent.setup()
    let prompted = false
    window.prompt = () => ((prompted = true), 'x')
    await openPlan()
    await user.click(screen.getByRole('button', { name: 'Save as a template' }))
    const sheet = await screen.findByRole('dialog', { name: 'Name this template' })
    const field = within(sheet).getByLabelText('Template name')
    expect(field.value).toBe('My practice')
    await user.clear(field)
    await user.type(field, 'Game week{Enter}')
    await waitFor(async () => expect((await db.templates.toArray())[0]?.name).toBe('Game week'))
    expect(prompted).toBe(false)
    expect(screen.queryByRole('dialog')).toBe(null)
  })

  it('Cancel saves nothing, and an empty name cannot be saved', async () => {
    const user = userEvent.setup()
    await openPlan()
    await user.click(screen.getByRole('button', { name: 'Save as a template' }))
    const sheet = await screen.findByRole('dialog', { name: 'Name this template' })
    await user.clear(within(sheet).getByLabelText('Template name'))
    expect(within(sheet).getByRole('button', { name: 'Save' }).disabled).toBe(true)
    await user.click(within(sheet).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBe(null)
    expect(await db.templates.count()).toBe(0)
  })
})
