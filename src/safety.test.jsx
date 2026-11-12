// Keeping data safe: persistence, the backup reminder, the home screen hint, the error screen,
// restore preview and the version match.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, within, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { backupWhere } from './lib/backupFile.js'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorScreen.jsx'
import { db, saveTeam, savePlayers, clearEverything, getSetting, setSetting, exportBackup } from './lib/db.js'
import { defaultRules } from './data/constants.js'
import { blankPlayer } from './lib/roster.js'
import { VERSION } from './changelog.js'
import pkg from '../package.json'
import {
  requestPersist, storageState, storageLine, backupReminderDue, installHintKind, isIosDevice, DAY,
} from './lib/safety.js'

const NOW = Date.parse('2026-11-11T12:00:00Z')
const iso = (offsetDays) => new Date(NOW + offsetDays * DAY).toISOString()

describe('keeping the data', () => {
  it('is safe where the browser has no storage manager', async () => {
    expect(await requestPersist(undefined)).toBe('unsupported')
    expect(await requestPersist({})).toBe('unsupported')
    expect(await storageState(undefined)).toBe('unsupported')
  })
  it('asks once when not yet kept, and not at all when already kept', async () => {
    const ask = vi.fn().mockResolvedValue(true)
    expect(await requestPersist({ persisted: async () => false, persist: ask })).toBe('persisted')
    expect(ask).toHaveBeenCalledTimes(1)
    const again = vi.fn()
    expect(await requestPersist({ persisted: async () => true, persist: again })).toBe('persisted')
    expect(again).not.toHaveBeenCalled()
  })
  it('reports a refusal, or an error, as not kept', async () => {
    expect(await requestPersist({ persisted: async () => false, persist: async () => false })).toBe('not-persisted')
    expect(await requestPersist({ persisted: async () => false, persist: async () => { throw new Error('no') } })).toBe('not-persisted')
  })
  it('words the Settings line from what the browser reports', () => {
    expect(storageLine('persisted')).toMatch(/agreed to keep this data/)
    expect(storageLine('not-persisted')).toMatch(/may clear this data if the app goes unused/)
    expect(storageLine('unsupported')).toMatch(/may clear this data/)
    expect(storageLine(null)).toBe(null)
  })
})

describe('when the backup reminder is due', () => {
  const base = { players: 0, plans: 0, lastBackupAt: null, snoozedUntil: null, now: NOW }
  it('needs a roster or three plans', () => {
    expect(backupReminderDue(base)).toBe(false)
    expect(backupReminderDue({ ...base, plans: 2 })).toBe(false)
    expect(backupReminderDue({ ...base, plans: 3 })).toBe(true)
    expect(backupReminderDue({ ...base, players: 1 })).toBe(true)
  })
  it('shows when there has never been a backup, and after 14 days', () => {
    expect(backupReminderDue({ ...base, players: 5 })).toBe(true)
    expect(backupReminderDue({ ...base, players: 5, lastBackupAt: iso(-13) })).toBe(false)
    expect(backupReminderDue({ ...base, players: 5, lastBackupAt: iso(-14) })).toBe(true)
  })
  it('stays away for 14 days after Not now, then returns', () => {
    expect(backupReminderDue({ ...base, players: 5, snoozedUntil: iso(14) })).toBe(false)
    expect(backupReminderDue({ ...base, players: 5, snoozedUntil: iso(-0.01) })).toBe(true)
  })
  it('clears after a backup', () => {
    expect(backupReminderDue({ ...base, players: 5, lastBackupAt: iso(0) })).toBe(false)
  })
})

describe('which home screen hint to show', () => {
  const b = { installed: false, dismissed: false, backupDue: false, hasPrompt: false, ios: false }
  it('shows the install prompt, or the iPhone steps, or nothing', () => {
    expect(installHintKind({ ...b, hasPrompt: true })).toBe('prompt')
    expect(installHintKind({ ...b, ios: true })).toBe('ios')
    expect(installHintKind(b)).toBe(null)
  })
  it('never when installed, dismissed, or while the backup card shows', () => {
    expect(installHintKind({ ...b, hasPrompt: true, installed: true })).toBe(null)
    expect(installHintKind({ ...b, ios: true, dismissed: true })).toBe(null)
    expect(installHintKind({ ...b, ios: true, backupDue: true })).toBe(null)
  })
  it('knows iPhones and iPads', () => {
    expect(isIosDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5)).toBe(true)
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true)
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false)
    expect(isIosDevice('Mozilla/5.0 (Linux; Android 14)', 5)).toBe(false)
  })
})

const team = { name: 'Blue Jays', division: '10U', experience: 'some', needs: ['grounders'], rules: defaultRules('10U'), sport: 'baseball' }
const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1'
const realUA = navigator.userAgent

async function withTeam({ players = 0 } = {}) {
  const t = await saveTeam({ ...team })
  if (players) await savePlayers(t.id, Array.from({ length: players }, (_, i) => ({ ...blankPlayer(), first: `P${i}` })))
  return t
}

beforeEach(async () => {
  cleanup()
  await clearEverything()
  window.location.hash = ''
  try { window.localStorage.clear() } catch { /* ignore */ }
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
  HTMLAnchorElement.prototype.click = vi.fn()
})
afterEach(() => {
  Object.defineProperty(navigator, 'userAgent', { value: realUA, configurable: true })
  delete window.matchMedia
  delete navigator.storage
})

describe('asking the browser from the app', () => {
  const fakeStorage = (persisted) => {
    const persist = vi.fn().mockResolvedValue(true)
    Object.defineProperty(navigator, 'storage', { value: { persisted: async () => persisted, persist }, configurable: true })
    return persist
  }
  it('asks once a team exists', async () => {
    const persist = fakeStorage(false)
    await withTeam()
    render(<App />)
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1))
  })
  it('does not ask before there is a team', async () => {
    const persist = fakeStorage(false)
    render(<App />)
    await screen.findByText('Set up your team')
    expect(persist).not.toHaveBeenCalled()
  })
  it('works in a browser without it', async () => {
    await withTeam()
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Build practice plan' })).toBeTruthy()
  })
  it('Settings says what the browser reports', async () => {
    await withTeam()
    window.location.hash = '#/settings'
    fakeStorage(true)
    render(<App />)
    expect((await screen.findByTestId('storage-line')).textContent).toMatch(/agreed to keep/)
    cleanup()
    fakeStorage(false)
    render(<App />)
    expect((await screen.findByTestId('storage-line')).textContent).toMatch(/may clear this data/)
    expect(screen.getByText(/Last backup: never\./)).toBeTruthy()
  })
})

describe('the backup card on Today', () => {
  it('appears with a roster and no backup, and Not now hides it for 14 days', async () => {
    const user = userEvent.setup()
    await withTeam({ players: 6 })
    render(<App />)
    const card = await screen.findByRole('region', { name: 'Backup reminder' })
    expect(within(card).getByText('Save a backup (takes 10 seconds)')).toBeTruthy()
    await user.click(within(card).getByRole('button', { name: 'Not now' }))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Backup reminder' })).toBe(null))
    const until = Date.parse(await getSetting('backupSnoozedUntil'))
    expect(until - Date.now()).toBeGreaterThan(13.9 * DAY)
  })
  it('is not shown for a brand new team', async () => {
    await withTeam()
    render(<App />)
    await screen.findByRole('button', { name: 'Build practice plan' })
    expect(screen.queryByRole('region', { name: 'Backup reminder' })).toBe(null)
  })
  it('saves a backup, records the time and goes away', async () => {
    const user = userEvent.setup()
    await withTeam({ players: 6 })
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Save backup' }))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Backup reminder' })).toBe(null))
    expect(Date.now() - Date.parse(await getSetting('lastBackupAt'))).toBeLessThan(5000)
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
  it('says where the file went after Save backup, using the shared where-line', async () => {
    const user = userEvent.setup()
    await withTeam({ players: 6 })
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Save backup' }))
    const done = await screen.findByRole('region', { name: 'Backup saved' })
    expect(within(done).getByText(backupWhere())).toBeTruthy()
  })
  it('does not show when the last backup was recent, and comes back after 14 days', async () => {
    await withTeam({ players: 6 })
    await setSetting('lastBackupAt', new Date(Date.now() - 3 * DAY).toISOString())
    render(<App />)
    await screen.findByRole('button', { name: 'Build practice plan' })
    expect(screen.queryByRole('region', { name: 'Backup reminder' })).toBe(null)
    cleanup()
    await setSetting('lastBackupAt', new Date(Date.now() - 15 * DAY).toISOString())
    render(<App />)
    expect(await screen.findByRole('region', { name: 'Backup reminder' })).toBeTruthy()
  })
})

describe('the home screen card on Today', () => {
  const ios = () => Object.defineProperty(navigator, 'userAgent', { value: IOS_UA, configurable: true })
  it('shows the two iPhone steps once, and Got it hides it for good', async () => {
    const user = userEvent.setup()
    ios()
    await withTeam()
    render(<App />)
    const card = await screen.findByRole('region', { name: 'Add to home screen' })
    expect(within(card).getByText('Tap the Share button.')).toBeTruthy()
    expect(within(card).getByText('Tap Add to Home Screen.')).toBeTruthy()
    await user.click(within(card).getByRole('button', { name: 'Got it' }))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Add to home screen' })).toBe(null))
    expect(await getSetting('installHintDismissed')).toBe(true)
  })
  it('never shows in the installed app', async () => {
    ios()
    window.matchMedia = () => ({ matches: true })
    await withTeam()
    render(<App />)
    await screen.findByRole('button', { name: 'Build practice plan' })
    expect(screen.queryByRole('region', { name: 'Add to home screen' })).toBe(null)
  })
  it('never shows together with the backup card: backup wins', async () => {
    ios()
    await withTeam({ players: 6 })
    render(<App />)
    expect(await screen.findByRole('region', { name: 'Backup reminder' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Add to home screen' })).toBe(null)
  })
  it('on Android uses the install prompt', async () => {
    const user = userEvent.setup()
    await withTeam()
    render(<App />)
    await screen.findByRole('button', { name: 'Build practice plan' })
    expect(screen.queryByRole('region', { name: 'Add to home screen' })).toBe(null)
    const prompt = vi.fn().mockResolvedValue(undefined)
    const ev = new Event('beforeinstallprompt', { cancelable: true })
    ev.prompt = prompt
    ev.userChoice = Promise.resolve({ outcome: 'accepted' })
    window.dispatchEvent(ev)
    const card = await screen.findByRole('region', { name: 'Add to home screen' })
    await user.click(within(card).getByRole('button', { name: 'Add to home screen' }))
    expect(prompt).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Add to home screen' })).toBe(null))
  })
})

describe('the error screen', () => {
  const Boom = () => {
    throw new Error('Kaboom in the planner')
  }
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
  afterEach(() => vi.restoreAllMocks())

  it('shows calm words, Reload, a backup button and the error text', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert').textContent).toMatch(/Something went wrong/)
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save a backup first' })).toBeTruthy()
    expect(screen.getByLabelText('Error details').textContent).toMatch(/Kaboom in the planner/)
    expect(screen.getByLabelText('Error details').textContent).toContain(`AttaCoach ${VERSION}`)
  })

  it('still saves a backup of the data even though the app crashed', async () => {
    const user = userEvent.setup()
    await withTeam({ players: 2 })
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    await user.click(screen.getByRole('button', { name: 'Save a backup first' }))
    expect(await screen.findByText(/Saved a backup of 1 team and 0 plans/)).toBeTruthy()
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    const blob = URL.createObjectURL.mock.calls[0][0]
    expect(JSON.parse(await blob.text()).players).toHaveLength(2)
    expect(await getSetting('lastBackupAt')).toBeTruthy()
  })

  it('renders the app normally when nothing is wrong', async () => {
    await withTeam()
    render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>,
    )
    expect(await screen.findByRole('button', { name: 'Build practice plan' })).toBeTruthy()
  })
})

describe('restoring a backup', () => {
  const backupFile = async () => {
    await withTeam({ players: 3 })
    const data = await exportBackup()
    data.plans = [
      { id: 'a', teamId: data.teams[0].id, date: '2026-10-02', createdAt: '2026-10-01T10:00:00Z', focus: [], blocks: [] },
      { id: 'b', teamId: data.teams[0].id, date: '2026-11-09', createdAt: '2026-11-08T10:00:00Z', focus: [], blocks: [] },
    ]
    return new File([JSON.stringify(data)], 'backup.json', { type: 'application/json' })
  }

  it('shows what the backup holds and asks before restoring', async () => {
    const user = userEvent.setup()
    const file = await backupFile()
    await clearEverything()
    await withTeam()
    window.location.hash = '#/settings'
    render(<App />)
    await screen.findByText('Backup')
    await user.upload(document.querySelector('input[type=file]'), file)
    const sheet = await screen.findByRole('dialog', { name: 'Restore this backup?' })
    const text = sheet.textContent
    expect(text).toMatch(/1 team: Blue Jays/)
    expect(text).toMatch(/3 players/)
    expect(text).toMatch(/2 plans \(Oct 2, 2026 to Nov 9, 2026\)/)
    expect(text).toMatch(/0 log entries/)
    expect(await db.plans.count()).toBe(0)
    await user.click(within(sheet).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBe(null)
    expect(await db.plans.count()).toBe(0)
  })

  it('restores after a yes', async () => {
    const user = userEvent.setup()
    const file = await backupFile()
    await clearEverything()
    await withTeam()
    window.location.hash = '#/settings'
    render(<App />)
    await screen.findByText('Backup')
    await user.upload(document.querySelector('input[type=file]'), file)
    await user.click(within(await screen.findByRole('dialog', { name: 'Restore this backup?' })).getByRole('button', { name: 'Restore' }))
    expect(await screen.findByText(/Restored 1 team and 2 plans/)).toBeTruthy()
    expect(await db.plans.count()).toBe(2)
  })

  it('says when something here will be replaced, and rejects other files without a sheet', async () => {
    const user = userEvent.setup()
    const file = await backupFile()
    window.location.hash = '#/settings'
    render(<App />)
    await screen.findByText('Backup')
    await user.upload(document.querySelector('input[type=file]'), file)
    expect((await screen.findByRole('dialog')).textContent).toMatch(/1 team and 0 plans here already match/)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.upload(document.querySelector('input[type=file]'), new File(['{"hello":1}'], 'x.json', { type: 'application/json' }))
    expect(await screen.findByText('This file is not an AttaCoach backup.')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBe(null)
  })
})

describe('the version', () => {
  it('matches between package.json and the app', () => {
    expect(pkg.version).toBe(VERSION)
  })
})
