import { useRef, useState } from 'react'
import { EXPERIENCE, RULES, needLabel, coachTitle, needsForDivision, spaceLabel, gearLabel, athleticDefault } from '../data/constants.js'
import { exportBackup, importBackup, setSetting, deleteTeam, clearEverything, savePlayers, saveTeam } from '../lib/db.js'
import { rollupNeeds } from '../lib/roster.js'
import { DRILLS } from '../data/drills.js'
import Roster from './Roster.jsx'
import PracticeSetup from './PracticeSetup.jsx'
import Sheet from './Sheet.jsx'
import { teamPractices, dayName } from '../lib/practices.js'
import { go } from '../lib/route.js'
import { shareText } from '../lib/share.js'
import { signOut, deleteAccount, friendlyAuthError } from '../lib/auth.js'
import { APP_URL, AUTH_REQUIRED, DONATE_URL, SHARE_TEXT } from '../config.js'
import { VERSION, CHANGELOG } from '../changelog.js'
import { TeamHeader } from './Header.jsx'

export default function TeamPage({ team, teams, theme, auth, coach = '', players = [] }) {
  const fileRef = useRef(null)
  const [msg, setMsg] = useState(null)
  const [nameDraft, setNameDraft] = useState(null)
  const [practiceDraft, setPracticeDraft] = useState(null)

  const editPractice = () =>
    setPracticeDraft({ practices: team.practices ?? [], equipment: team.equipment ?? null, athletic: team.athletic ?? athleticDefault(team.division) })
  const savePractice = async () => {
    const practices = practiceDraft.practices.map((p) => ({ ...p, name: p.name.trim() || 'Practice' }))
    await saveTeam({ ...team, ...practiceDraft, practices })
    setPracticeDraft(null)
  }

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

  const suggestedNeeds = rollupNeeds(players, needsForDivision(team.division, DRILLS).map((n) => n.id))
  const needsDiffer = suggestedNeeds.length > 0 && suggestedNeeds.join() !== (team.needs ?? []).slice(0, suggestedNeeds.length).join()
  const useRoster = async () => {
    // The roster's picks go first; anything else already on the list stays below them.
    const rest = (team.needs ?? []).filter((n) => !suggestedNeeds.includes(n))
    await saveTeam({ ...team, needs: [...suggestedNeeds, ...rest] })
    setMsg('Team needs updated from your players.')
  }

  const exp = EXPERIENCE.find((x) => x.id === team.experience)

  return (
    <>
      <TeamHeader team={team} title="Team" />
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
            {team.unsure?.length > 0 && (
              <div>
                <dt className="small muted">Least sure about teaching</dt>
                <dd style={{ margin: 0 }}>{team.unsure.map(needLabel).join(', ')}</dd>
              </div>
            )}
            <div>
              <dt className="small muted">Biggest needs</dt>
              <dd style={{ margin: 0 }}>
                {!team.needs.length && <span className="muted">None chosen. Plans use a starter focus on the basics.</span>}
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

        <section className="card" aria-labelledby="roster-title">
          <h3 id="roster-title">Players</h3>
          <Roster division={team.division} players={players} onChange={(next) => savePlayers(team.id, next)} />
          {needsDiffer && (
            <div className="suggest">
              <span>Your players point to: {suggestedNeeds.map(needLabel).join(', ')}.</span>
              <button className="btn small" onClick={useRoster}>
                Update team needs
              </button>
            </div>
          )}
        </section>

        <section className="card" aria-labelledby="practice-title">
          <div className="row">
            <h3 id="practice-title" className="spacer">
              How you practice
            </h3>
            <button className="btn quiet small" onClick={editPractice}>
              Edit
            </button>
          </div>
          <ul className="plain-list small">
            {teamPractices(team).map((p) => (
              <li key={p.id}>
                <strong>{p.name}</strong>
                {p.day != null ? `, ${dayName(p.day)}` : ''}, {p.minutes} min, {p.spaces.map(spaceLabel).join(' and ').toLowerCase()}
              </li>
            ))}
          </ul>
          <p className="small muted" style={{ margin: 0 }}>
            Equipment: {team.equipment?.length ? team.equipment.map(gearLabel).join(', ') : 'not set (plans assume tees, cones and basic gear)'}.
            {' '}Athletic warm-up: {(team.athletic ?? athleticDefault(team.division)) ? 'on' : 'off'}.
          </p>
          {practiceDraft && (
            <Sheet title="How you practice" onClose={() => setPracticeDraft(null)}>
              <PracticeSetup division={team.division} value={practiceDraft} onChange={setPracticeDraft} />
              <button className="btn" onClick={savePractice}>
                Save
              </button>
            </Sheet>
          )}
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
