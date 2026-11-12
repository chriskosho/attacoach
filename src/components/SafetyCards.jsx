import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { setSetting } from '../lib/db.js'
import { saveBackupFile, backupWhere } from '../lib/backupFile.js'
import { backupReminderDue, snoozeBackupReminder, installHintKind, readSafetySettings, isInstalledApp, isIosDevice, useInstallPrompt, runInstallPrompt, INSTALL_DISMISSED } from '../lib/safety.js'

// One small, dismissible card on Today: a backup reminder, or (never together) the home screen hint.
export default function SafetyCards({ players = 0, plans = 0 }) {
  const s = useLiveQuery(readSafetySettings, [])
  const prompt = useInstallPrompt()
  const [saved, setSaved] = useState(false)
  if (!s) return null

  const backupDue = backupReminderDue({ players, plans, lastBackupAt: s.lastBackupAt, snoozedUntil: s.snoozedUntil })
  const kind = installHintKind({ installed: isInstalledApp(), dismissed: s.installDismissed, backupDue, hasPrompt: !!prompt, ios: isIosDevice() })

  if (saved) {
    return (
      <section className="card safety-card" aria-label="Backup saved">
        <strong>Backup saved</strong>
        <span className="small muted">{backupWhere()}</span>
      </section>
    )
  }

  if (backupDue && !saved) {
    return (
      <section className="card safety-card" aria-label="Backup reminder">
        <strong>Save a backup (takes 10 seconds)</strong>
        <span className="small muted">Your teams and plans live only on this phone. A backup file is the safe copy.</span>
        <div className="safety-links">
          <button
            className="link-btn"
            onClick={async () => {
              await saveBackupFile()
              setSaved(true)
            }}
          >
            Save backup
          </button>
          <button className="link-btn muted-link" onClick={() => snoozeBackupReminder()}>
            Not now
          </button>
        </div>
      </section>
    )
  }

  if (kind) {
    return (
      <section className="card safety-card" aria-label="Add to home screen">
        <strong>Add AttaCoach to your home screen</strong>
        {kind === 'ios' ? (
          <ol className="small muted safety-steps">
            <li>Tap the Share button.</li>
            <li>Tap Add to Home Screen.</li>
          </ol>
        ) : (
          <span className="small muted">It opens like an app and works without signal.</span>
        )}
        <div className="safety-links">
          {kind === 'prompt' && (
            <button className="link-btn" onClick={runInstallPrompt}>
              Add to home screen
            </button>
          )}
          <button className="link-btn muted-link" onClick={() => setSetting(INSTALL_DISMISSED, true)}>
            {kind === 'ios' ? 'Got it' : 'Not now'}
          </button>
        </div>
      </section>
    )
  }
  return null
}
