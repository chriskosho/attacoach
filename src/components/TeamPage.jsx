import { useState } from 'react'
import { EXPERIENCE, RULES, needLabel, needsForDivision, spaceLabel, gearLabel, athleticDefault } from '../data/constants.js'
import { setSetting, deleteTeam, savePlayers, saveTeam } from '../lib/db.js'
import { rollupNeeds } from '../lib/roster.js'
import { DRILLS } from '../data/drills.js'
import Roster from './Roster.jsx'
import PracticeSetup from './PracticeSetup.jsx'
import Sheet from './Sheet.jsx'
import { teamPractices, dayName, practiceStaff, staffSummary } from '../lib/practices.js'
import { lastAdults } from './Setup.jsx'
import { go } from '../lib/route.js'
import { TeamHeader } from './Header.jsx'
import { ruleText, sportOf, sportSummary } from '../lib/sport.js'

// Everything about one team: who is on it, how it practices, its needs and rules. App-wide things
// (your name, backup, display, account) live under Settings.
// The rules that are on, in one line: "Rules: kids pitch, stealing, leading off".
function rulesLine(team) {
  const on = RULES.filter((r) => team.rules?.[r.id]).map((r) => ruleText(r, sportOf(team)).label.toLowerCase())
  return on.length ? `Rules: ${on.join(', ')}` : 'Rules: standard'
}

export default function TeamPage({ team, teams, players = [] }) {
  const [msg, setMsg] = useState(null)
  const [practiceDraft, setPracticeDraft] = useState(null)
  const [draftOpen, setDraftOpen] = useState(false)
  const staff = practiceStaff(team, null, lastAdults())

  const editPractice = () =>
    setPracticeDraft({ adults: staff.adults, coachRole: staff.role, practices: team.practices ?? [], equipment: team.equipment ?? null, athletic: team.athletic ?? athleticDefault(team.division) })
  const savePractice = async () => {
    const practices = practiceDraft.practices.map((p) => ({ ...p, name: p.name.trim() || 'Practice' }))
    await saveTeam({ ...team, ...practiceDraft, practices })
    setPracticeDraft(null)
  }

  const removeTeam = async () => {
    if (!team.sample && !window.confirm(`Delete ${team.name} and all of its plans? This cannot be undone.`)) return
    await deleteTeam(team.id)
    go('today')
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
          <div className="row">
            <h2 className="spacer">
              {team.name}
              {team.sample && <span className="sample-tag">Sample</span>}
            </h2>
            <button className="link-btn" onClick={() => go(`setup/${team.id}`)}>
              Edit
            </button>
          </div>
          <details className="fold team-details">
            <summary>{[sportSummary(team), team.division, exp?.label].filter(Boolean).join(' · ')}</summary>
          <dl className="stack" style={{ margin: 0 }}>
            <div>
              <dt className="small muted">Sport</dt>
              <dd style={{ margin: 0 }}>{sportSummary(team)}</dd>
            </div>
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
              <dd style={{ margin: 0 }}>{rulesLine(team)}</dd>
            </div>
          </dl>
          </details>
        </section>

        <section className="card" aria-labelledby="roster-title">
          <h3 id="roster-title">Players</h3>
          <Roster division={team.division} players={players} onChange={(next) => savePlayers(team.id, next)} />
          {needsDiffer && (
            <div className="suggest">
              <span>Your players point to: {suggestedNeeds.map(needLabel).join(', ')}.</span>
              <button className="btn ghost small" onClick={useRoster}>
                Update team needs
              </button>
            </div>
          )}
          {msg && (
            <p className="small" role="status">
              {msg}
            </p>
          )}
        </section>

        <section className="card" aria-labelledby="practice-title">
          <div className="row">
            <h3 id="practice-title" className="spacer">
              How you practice
            </h3>
            <button className="link-btn" onClick={editPractice}>
              Edit
            </button>
          </div>
          <p className="small" style={{ margin: 0 }}>
            <strong>Adults:</strong> {staffSummary(staff.adults, staff.role)}
          </p>
          <ul className="plain-list small">
            {teamPractices(team).map((p) => {
              const own = practiceStaff(team, p, lastAdults())
              return (
                <li key={p.id}>
                  <strong>{p.name}</strong>
                  {p.day != null ? `, ${dayName(p.day)}` : ''}, {p.minutes} min, {p.spaces.map(spaceLabel).join(' and ').toLowerCase()}
                  {own.own ? `, ${staffSummary(own.adults, own.role)}` : ''}
                </li>
              )
            })}
          </ul>
          <p className="small muted" style={{ margin: 0 }}>
            Equipment: {team.equipment?.length ? team.equipment.map(gearLabel).join(', ') : 'not set (plans assume tees, cones and basic gear)'}.
            {' '}Athletic warm-up: {(team.athletic ?? athleticDefault(team.division)) ? 'on' : 'off'}.
          </p>
          {practiceDraft && (
            <Sheet title="How you practice" onClose={() => setPracticeDraft(null)}>
              <PracticeSetup division={team.division} value={practiceDraft} onChange={setPracticeDraft} onEditingChange={setDraftOpen} />
              {!draftOpen && (
                <button className="btn" onClick={savePractice}>
                  Save
                </button>
              )}
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
                  <span>
                    {t.sample ? 'Sample, ' : ''}
                    {t.division} {sportOf(t) === 'softball' ? 'softball' : 'baseball'}
                  </span>
                </button>
              ))}
            </div>
          )}
          <button className="link-btn" onClick={() => go('setup/new')}>
            Add another team
          </button>
        </section>

        <button className="btn danger" onClick={removeTeam}>
          {team.sample ? 'Delete this sample team' : 'Delete this team'}
        </button>
      </main>
    </>
  )
}
