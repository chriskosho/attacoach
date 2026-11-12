import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { coachTitle } from '../data/constants.js'
import { setSetting, clearEverything, getSetting } from '../lib/db.js'
import { saveBackupFile, backupMessage, backupWhere } from '../lib/backupFile.js'
import RestoreBackup from './RestoreBackup.jsx'
import { storageState, storageLine, LAST_BACKUP } from '../lib/safety.js'
import { go } from '../lib/route.js'
import { shareText } from '../lib/share.js'
import { signOut, deleteAccount, friendlyAuthError } from '../lib/auth.js'
import { APP_URL, AUTH_REQUIRED, DONATE_URL, SHARE_TEXT, TEST_TOOLS } from '../config.js'
import TestTools from './TestTools.jsx'
import { loadScenario } from '../lib/scenarios.js'
import { VERSION, CHANGELOG } from '../changelog.js'
import { TeamHeader } from './Header.jsx'
import { SettingsFeedback } from './Feedback.jsx'
import { feedbackAvailable } from '../lib/feedback.js'

// App-wide settings: your name, how the app looks, backup, sharing and account. Everything about
// one team (players, how you practice, rules) lives on the Team tab instead.
export default function SettingsPage({ team, theme, auth, coach = '' }) {
  const [msg, setMsg] = useState(null)
  const [nameDraft, setNameDraft] = useState(null)

  const saveName = async () => {
    const n = nameDraft.trim().replace(/\s+/g, ' ')
    if (n) await setSetting('coachName', n)
    setNameDraft(null)
  }

  const [storage, setStorage] = useState(null)
  useEffect(() => {
    storageState().then(setStorage)
  }, [])
  const lastBackup = useLiveQuery(() => getSetting(LAST_BACKUP, null), [])

  const download = async () => {
    const data = await saveBackupFile()
    setMsg(`${backupMessage(data)} ${backupWhere()}`)
  }

  const wipe = async () => {
    if (!window.confirm('Delete every team and plan on this device? Save a backup first if you might want them later.')) return
    await clearEverything()
    go('today')
  }

  const shareApp = async () => {
    const r = await shareText('AttaCoach', SHARE_TEXT, APP_URL)
    if (r === 'copied') setMsg('Link copied. Paste it into a text or email.')
    else if (r === 'failed') setMsg(`Sharing isn't available here. The link is ${APP_URL}`)
  }

  const doSignOut = async () => {
    if (!window.confirm('Sign out of AttaCoach on this device? Your teams and plans stay here. You will need to sign in again to use the app.')) return
    await signOut()
  }

  const doDeleteAccount = async () => {
    if (!navigator.onLine) {
      setMsg('Connect to the internet to delete your account.')
      return
    }
    if (!window.confirm('Delete your AttaCoach account? Your sign-in is removed and you will be signed out. Teams and plans stay on this device until you delete them. This cannot be undone.')) return
    try {
      await deleteAccount()
    } catch (err) {
      setMsg(friendlyAuthError(err, 'delete'))
    }
  }

  const replay = async () => {
    if (!window.confirm('Delete everything on this device and start setup again? Save a backup first if you need these teams.')) return
    await clearEverything()
    go('today')
  }

  return (
    <>
      <TeamHeader team={team} title="Settings" backTo="team" />
      <main className="page">
        <section className="card">
          <h2 className="sm-h">Coach profile</h2>
          {nameDraft === null ? (
            <div className="row">
              <span className="spacer">{coach ? coachTitle(coach) : <span className="muted">No name yet</span>}</span>
              <button className="btn quiet small" onClick={() => setNameDraft(coach)}>
                {coach ? 'Edit' : 'Add your name'}
              </button>
            </div>
          ) : (
            <>
              <label className="field">
                Your name
                <input type="text" value={nameDraft} maxLength={40} autoFocus onChange={(e) => setNameDraft(e.target.value)} />
              </label>
              <div className="action-row">
                <button className="btn" disabled={!nameDraft.trim()} onClick={saveName}>
                  Save name
                </button>
                <button className="btn quiet" onClick={() => setNameDraft(null)}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </section>

        <section className="card">
          <h2 className="sm-h">Display</h2>
          <div className="choices" role="group" aria-label="Theme">
            {[
              ['system', 'Auto', 'Follows your phone'],
              ['light', 'Light', null],
              ['dark', 'Dark', null],
              ['sun', 'High contrast (bright sun)', 'White background, black text, heavier type'],
            ].map(([id, label, help]) => (
              <button key={id} type="button" className="choice" aria-pressed={theme === id} onClick={() => setSetting('theme', id)}>
                <strong>{label}</strong>
                {help && <span>{help}</span>}
              </button>
            ))}
          </div>
        </section>

        <SettingsFeedback team={team} />

        <section className="card">
          <h2 className="sm-h">Share AttaCoach</h2>
          <p className="small muted">Know a coach who could use it? Send them the link.</p>
          <button className="btn quiet" onClick={shareApp}>
            Share AttaCoach
          </button>
        </section>

        <section className="card">
          <h2 className="sm-h">Support AttaCoach</h2>
          <p className="small muted">AttaCoach is free and has no ads. If it helps your team, you can chip in.</p>
          <a className="btn quiet" href={DONATE_URL} target="_blank" rel="noopener noreferrer">
            Donate with PayPal
          </a>
        </section>

        <section className="card">
          <h2 className="sm-h">Backup</h2>
          <p className="small">
            Saved only on this phone. Last backup: {lastBackup ? `${new Date(lastBackup).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}.` : 'never.'}
          </p>
          <details className="fold">
            <summary>About backups</summary>
            <p className="small muted">
              Your teams and plans are saved only on this device. Save a backup file to keep them safe or move them to a new phone.
            </p>
            {storageLine(storage) && <p className="small" data-testid="storage-line">{storageLine(storage)}</p>}
          </details>
          <div className="action-row">
            <button className="btn quiet" onClick={download}>
              Save backup
            </button>
            <RestoreBackup onMessage={setMsg} />
          </div>
          {msg && (
            <p className="small" role="status">
              {msg}
            </p>
          )}
        </section>

        <section className="card">
          <h2 className="sm-h">Privacy</h2>
          <details className="fold">
            <summary>No ads, no tracking. Your data stays on this phone.</summary>
            <ul className="small privacy-list">
              <li>AttaCoach has no ads, tracking or analytics.{AUTH_REQUIRED && ' You sign in with your email, which is used only to sign you in.'}</li>
              <li>Your teams, players, plans and log stay in this browser on this device. Nothing about them is sent to a server.</li>
              <li>A backup is a file you save yourself. AttaCoach never uploads it; you decide where it goes.</li>
              <li>The "Find a video on YouTube" button opens a YouTube search in a new tab. YouTube sees that search, not your team.</li>
              {feedbackAvailable() && <li>Feedback is sent only if you tap Open my email app and press send there. It contains only what you see on the screen: no names.</li>}
              <li>Clearing your browser data deletes everything here, so keep a backup.</li>
            </ul>
          </details>
        </section>

        <section className="card">
          <h2 className="sm-h">About</h2>
          <details className="fold">
            <summary>
              AttaCoach {VERSION} · What's new
            </summary>
            <div className="small">
              <strong>What's new in {CHANGELOG[0].version}</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                {CHANGELOG[0].items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
            <p className="small muted">Drills are original to AttaCoach. Check your league's rulebook for local rules and pitch limits.</p>
          </details>
        </section>

        {auth?.email && (
          <section className="card">
            <h2 className="sm-h">Account</h2>
            <p className="small">
              Signed in as <strong>{auth.email}</strong>
            </p>
            <div className="action-row">
              <button className="btn quiet" onClick={doSignOut}>
                Sign out
              </button>
              <button className="btn danger" onClick={doDeleteAccount}>
                Delete account
              </button>
            </div>
            <p className="small muted">Signing out keeps your teams and plans on this device.</p>
          </section>
        )}

        {TEST_TOOLS && (
          <section className="card" aria-labelledby="test-title">
            <h2 className="sm-h" id="test-title">Testing tools</h2>
            <p className="small muted">Add a ready-made team to try different situations. It becomes your current team; your other teams stay.</p>
            <TestTools
              label="Add a ready-made team"
              onPick={async (sc) => {
                await loadScenario(sc, { keepCoach: true })
                go('today')
              }}
            />
            <button className="btn quiet" onClick={replay}>
              Start over and replay setup
            </button>
          </section>
        )}
        <button className="btn danger" onClick={wipe}>
          Delete everything on this device
        </button>
      </main>
    </>
  )
}
