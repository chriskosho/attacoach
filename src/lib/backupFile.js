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

