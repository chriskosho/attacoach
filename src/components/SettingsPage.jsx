import { useRef, useState } from 'react'
import { coachTitle } from '../data/constants.js'
import { exportBackup, importBackup, setSetting, clearEverything } from '../lib/db.js'
import { go } from '../lib/route.js'
import { shareText } from '../lib/share.js'
import { signOut, deleteAccount, friendlyAuthError } from '../lib/auth.js'
import { APP_URL, AUTH_REQUIRED, DONATE_URL, SHARE_TEXT, TEST_TOOLS } from '../config.js'
import TestTools from './TestTools.jsx'
import { loadScenario } from '../lib/scenarios.js'
import { VERSION, CHANGELOG } from '../changelog.js'
import { TeamHeader } from './Header.jsx'

// App-wide settings: your name, how the app looks, backup, sharing and account. Everything about
// one team (players, how you practice, rules) lives on the Team tab instead.
export default function SettingsPage({ team, theme, auth, coach = '' }) {
  const fileRef = useRef(null)
  const [msg, setMsg] = useState(null)
  const [nameDraft, setNameDraft] = useState(null)

  const saveName = async () => {
    const n = nameDraft.trim().replace(/\s+/g, ' ')
    if (n) await setSetting('coachName', n)
    setNameDraft(null)
  }

  const download = async () => {
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
    setMsg(`Saved a backup of ${data.teams.length} ${data.teams.length === 1 ? 'team' : 'teams'} and ${data.plans.length} plans${data.debriefs?.length ? ` and ${data.debriefs.length} log ${data.debriefs.length === 1 ? 'entry' : 'entries'}` : ''}.`)
  }

  const restore = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      const r = await importBackup(data)
      setMsg(`Restored ${r.teams} ${r.teams === 1 ? 'team' : 'teams'} and ${r.plans} plans${r.debriefs ? ` and ${r.debriefs} log ${r.debriefs === 1 ? 'entry' : 'entries'}` : ''}.`)
    } catch (err) {
      setMsg(err.message?.includes('AttaCoach') ? err.message : 'That file could not be read. Choose an AttaCoach backup (.json).')
    }
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
          <h3>Coach profile</h3>
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
          <h3>Display</h3>
          <div className="seg" role="group" aria-label="Theme">
            {[
              ['system', 'Auto'],
              ['light', 'Light'],
              ['dark', 'Dark'],
            ].map(([id, label]) => (
              <button key={id} aria-pressed={theme === id} onClick={() => setSetting('theme', id)}>
                {label}
              </button>
            ))}
          </div>
          <p className="small muted">Light is easiest to read in bright sun.</p>
        </section>

        <section className="card">
          <h3>Share AttaCoach</h3>
          <p className="small muted">Know a coach who could use it? Send them the link.</p>
          <button className="btn quiet" onClick={shareApp}>
            Share AttaCoach
          </button>
        </section>

        <section className="card">
          <h3>Support AttaCoach</h3>
          <p className="small muted">AttaCoach is free and has no ads. If it helps your team, you can chip in.</p>
          <a className="btn quiet" href={DONATE_URL} target="_blank" rel="noopener noreferrer">
            Donate with PayPal
          </a>
        </section>

        <section className="card">
          <h3>Backup</h3>
          <p className="small muted">
            Your teams and plans are saved only on this device. Save a backup file to keep them safe or move them to a new phone.
          </p>
          <div className="action-row">
            <button className="btn quiet" onClick={download}>
              Save backup
            </button>
            <button className="btn quiet" onClick={() => fileRef.current?.click()}>
              Restore
            </button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={restore} />
          {msg && (
            <p className="small" role="status">
              {msg}
            </p>
          )}
        </section>

        <section className="card">
          <h3>Privacy</h3>
          <p className="small">
            AttaCoach has no ads or tracking.{AUTH_REQUIRED && ' You sign in with your email, which is used only to sign you in.'} Your teams and plans stay in this browser on this device, and nothing about them is sent to a server. Clearing your browser data deletes them, so keep a backup.
          </p>
        </section>

        <section className="card">
          <h3>About</h3>
          <p className="small">AttaCoach {VERSION}. Drills are original to AttaCoach. Check your league's rulebook for local rules and pitch limits.</p>
          {CHANGELOG.slice(0, 2).map((c) => (
            <div key={c.version} className="small">
              <strong>
                What's new in {c.version}
              </strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                {c.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {auth?.email && (
          <section className="card">
            <h3>Account</h3>
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
            <h3 id="test-title">Testing tools</h3>
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
