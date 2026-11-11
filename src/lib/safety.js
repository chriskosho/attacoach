// Keeping a coach's data safe: asking the browser to keep it, the backup reminder, and the
// "add to home screen" hint. The rules are plain functions so they can be tested without a screen.
import { useEffect, useState } from 'react'
import { getSetting, setSetting } from './db.js'

export const DAY = 24 * 60 * 60 * 1000
export const BACKUP_EVERY_DAYS = 14

// ---------------------------------------------------------------- keep the data
/**
 * Asks the browser to keep this site's data. Safe where it is not supported.
 * Returns 'persisted' (already or now kept), 'not-persisted' (the browser said no or has not
 * said yes) or 'unsupported'.
 */
export async function requestPersist(storage = typeof navigator !== 'undefined' ? navigator.storage : undefined) {
  try {
    if (!storage || typeof storage.persist !== 'function') return 'unsupported'
    if (typeof storage.persisted === 'function' && (await storage.persisted())) return 'persisted'
    return (await storage.persist()) ? 'persisted' : 'not-persisted'
  } catch {
    return 'not-persisted'
  }
}

// What the browser reports right now, without asking for anything.
export async function storageState(storage = typeof navigator !== 'undefined' ? navigator.storage : undefined) {
  try {
    if (!storage || typeof storage.persisted !== 'function') return 'unsupported'
    return (await storage.persisted()) ? 'persisted' : 'not-persisted'
  } catch {
    return 'unsupported'
  }
}

// One honest line for Settings, from what the browser reports.
export function storageLine(state) {
  if (state === 'persisted') return 'Your browser has agreed to keep this data on this device. Clearing the site’s data would still remove it, so a backup is your safe copy.'
  if (state === 'not-persisted' || state === 'unsupported') return 'Your browser may clear this data if the app goes unused. A backup is your safeguard.'
  return null
}

// ---------------------------------------------------------------- backup reminder
export const LAST_BACKUP = 'lastBackupAt'
export const BACKUP_SNOOZE = 'backupSnoozedUntil'
export const INSTALL_DISMISSED = 'installHintDismissed'

export const recordBackup = () => setSetting(LAST_BACKUP, new Date().toISOString())
export const snoozeBackupReminder = (now = Date.now()) => setSetting(BACKUP_SNOOZE, new Date(now + BACKUP_EVERY_DAYS * DAY).toISOString())

/**
 * Whether to show "Save a backup". There is something worth keeping (a roster, or three or more
 * plans), no backup for 14 days (or ever), and it has not been dismissed in the last 14 days.
 */
export function backupReminderDue({ players = 0, plans = 0, lastBackupAt = null, snoozedUntil = null, now = Date.now() }) {
  if (players < 1 && plans < 3) return false
  if (snoozedUntil && now < Date.parse(snoozedUntil)) return false
  if (!lastBackupAt) return true
  return now - Date.parse(lastBackupAt) >= BACKUP_EVERY_DAYS * DAY
}

// ---------------------------------------------------------------- home screen hint
export function isInstalledApp() {
  try {
    return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  } catch {
    return false
  }
}

// iPhone and iPad (iPadOS says "Macintosh" but has a touch screen).
export function isIosDevice(ua = navigator.userAgent, touchPoints = navigator.maxTouchPoints) {
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)
}

let deferredPrompt = null
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

export function useInstallPrompt() {
  const [, tick] = useState(0)
  useEffect(() => {
    const fn = () => tick((n) => n + 1)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])
  return deferredPrompt
}

export async function runInstallPrompt() {
  const p = deferredPrompt
  if (!p) return null
  deferredPrompt = null
  notify()
  try {
    await p.prompt()
    return (await p.userChoice)?.outcome ?? null
  } catch {
    return null
  }
}

/**
 * Which home-screen hint to show: 'prompt' (Android's own install prompt is ready), 'ios' (two
 * steps in words) or null. Never when the app is already installed, never after it was
 * dismissed, and never while the backup card is showing.
 */
export function installHintKind({ installed, dismissed, backupDue, hasPrompt, ios }) {
  if (installed || dismissed || backupDue) return null
  if (hasPrompt) return 'prompt'
  if (ios) return 'ios'
  return null
}

// ---------------------------------------------------------------- reading the settings
export async function readSafetySettings() {
  const [lastBackupAt, snoozedUntil, installDismissed] = await Promise.all([getSetting(LAST_BACKUP, null), getSetting(BACKUP_SNOOZE, null), getSetting(INSTALL_DISMISSED, false)])
  return { lastBackupAt, snoozedUntil, installDismissed: !!installDismissed }
}

