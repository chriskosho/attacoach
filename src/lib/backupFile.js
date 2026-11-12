import { exportBackup } from './db.js'
import { recordBackup } from './safety.js'

// Saves a backup file to the device and notes when. Works from anywhere, including the error screen.
export async function saveBackupFile() {
  const data = await exportBackup()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `attacoach-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  await recordBackup()
  return data
}

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function backupMessage(data) {
  return `Saved a backup of ${plural(data.teams.length, 'team')} and ${plural(data.plans.length, 'plan')}${data.debriefs?.length ? ` and ${plural(data.debriefs.length, 'log entry', 'log entries')}` : ''}.`
}


// Where the saved file went. The app cannot see this, so it only says where to look.
export function isIOS(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent, touchPoints = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints) {
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)
}

export function backupWhere(ios = isIOS()) {
  return ios
    ? 'Check Files > Downloads, or choose Save to Files if a share sheet opens.'
    : 'Look in your Downloads folder, or wherever your browser saves files.'
}
