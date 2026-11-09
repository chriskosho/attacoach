import { useRef, useState } from 'react'
import { EXPERIENCE, RULES, needLabel } from '../data/constants.js'
import { exportBackup, importBackup, setSetting, deleteTeam, clearEverything } from '../lib/db.js'
import { go } from '../lib/route.js'
import { VERSION, CHANGELOG } from '../changelog.js'
import { TeamHeader } from './Header.jsx'

export default function TeamPage({ team, teams, theme }) {
  const fileRef = useRef(null)
  const [msg, setMsg] = useState(null)

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
    setMsg(`Saved a backup of ${data.teams.length} ${data.teams.length === 1 ? 'team' : 'teams'} and ${data.plans.length} plans.`)
  }

  const restore = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      const r = await importBackup(data)
      setMsg(`Restored ${r.teams} ${r.teams === 1 ? 'team' : 'teams'} and ${r.plans} plans.`)
    } catch (err) {
      setMsg(err.message?.includes('AttaCoach') ? err.message : 'That file could not be read. Choose an AttaCoach backup (.json).')
    }
  }

  const removeTeam = async () => {
    if (!window.confirm(`Delete ${team.name} and all of its plans? This cannot be undone.`)) return
    await deleteTeam(team.id)
    go('today')
  }

  const wipe = async () => {
    if (!window.confirm('Delete every team and plan on this device? Save a backup first if you might want them later.')) return
    await clearEverything()
    go('today')
  }

  const exp = EXPERIENCE.find((x) => x.id === team.experience)

  return (
    <>
      <TeamHeader team={team} title="Team" />
      <main className="page">
        <section className="card">
          <div className="row">
            <h2 className="spacer">{team.name}</h2>
            <button className="btn quiet small" onClick={() => go(`setup/${team.id}`)}>
              Edit
            </button>
          </div>
          <dl className="stack" style={{ margin: 0 }}>
            <div>
              <dt className="small muted">Division</dt>
              <dd style={{ margin: 0 }}>{team.division}</dd>
            </div>
            <div>
              <dt className="small muted">Your coaching experience</dt>
              <dd style={{ margin: 0 }}>{exp?.label}</dd>
            </div>
            <div>
              <dt className="small muted">Biggest needs</dt>
              <dd style={{ margin: 0 }}>
                <ol style={{ margin: 0, paddingLeft: 22 }}>
                  {team.needs.map((n) => (
                    <li key={n}>{needLabel(n)}</li>
                  ))}
                </ol>
              </dd>
            </div>
            <div>
              <dt className="small muted">Game rules</dt>
              <dd style={{ margin: 0 }}>
                {RULES.map((r) => (
                  <div key={r.id}>
                    {r.label}: {team.rules?.[r.id] ? 'on' : 'off'}
                  </div>
                ))}
              </dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h3>Teams</h3>
          {teams.length > 1 && (
            <div className="choices">
              {teams.map((t) => (
                <button key={t.id} className="choice" aria-pressed={t.id === team.id} onClick={() => setSetting('currentTeamId', t.id)}>
                  <strong>{t.name}</strong>
                  <span>{t.division}</span>
                </button>
              ))}
            </div>
          )}
          <button className="btn quiet" onClick={() => go('setup/new')}>
            Add another team
          </button>
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
            AttaCoach has no accounts, ads or tracking. Everything you enter stays in this browser on this device. Nothing is sent to a server. Clearing your browser data deletes it, so keep a backup.
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

        <button className="btn danger" onClick={removeTeam}>
          Delete this team
        </button>
        <button className="btn danger" onClick={wipe}>
          Delete everything on this device
        </button>
      </main>
    </>
  )
}
