import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { DRILLS, drillById, allDrills, customDrills } from '../data/drills.js'
import { CATEGORIES, LEVELS, NEEDS, SPACES, needsForDivision, MAX_LEVEL_FOR, levelIndex } from '../data/constants.js'
import { db, toggleTeamList, saveCustomDrill, deleteCustomDrill } from '../lib/db.js'
import SkillChips from './SkillChips.jsx'
import { fitsDivision, rulesAllow } from '../lib/plan.js'
import { go, store } from '../lib/route.js'
import { TeamHeader } from './Header.jsx'
import { sportFits, drillFor, sportOf, sportLabel, writtenFor } from '../lib/sport.js'
import { DrillMeta, DrillText } from './DrillText.jsx'

export function filterDrills(drills, { team, query = '', category = '', need = '', level = '', fitsTeam = true, show = '' }) {
  const q = query.trim().toLowerCase()
  const favorites = new Set(team.favorites ?? [])
  const hidden = new Set(team.hidden ?? [])
  // Read and searched in the team's sport's wording.
  return drills.map((d) => drillFor(d, team)).filter((d) => {
    if (show === 'favorites' && !favorites.has(d.id)) return false
    if (show === 'hidden' && !hidden.has(d.id)) return false
    if (show === 'yours' && !d.custom) return false
    if (fitsTeam && !(sportFits(d, team) && fitsDivision(d, team.division) && rulesAllow(d, team.rules))) return false
    if (category && d.category !== category) return false
    if (need && !d.needs.includes(need)) return false
    if (level && d.level !== level) return false
    if (q && !(d.name.toLowerCase().includes(q) || d.setup.toLowerCase().includes(q) || d.steps.join(' ').toLowerCase().includes(q))) return false
    return true
  })
}

export function DrillList({ drills, onPick, team = null, action = null, empty = null, grouped = false }) {
  if (!drills.length) {
    return (
      <div className="card empty">
        <p className="muted">{empty?.text ?? 'No drills match. Try clearing a filter.'}</p>
        {empty?.action && (
          <button className="btn ghost" onClick={empty.action.onClick}>
            {empty.action.label}
          </button>
        )}
      </div>
    )
  }
  const favorites = new Set(team?.favorites ?? [])
  const hidden = new Set(team?.hidden ?? [])
  const rows = (list) =>
    list.map((d) => (
      <div key={d.id} className={action ? 'drill-row-wrap' : undefined} style={action ? undefined : { display: 'contents' }}>
        <button className="drill-row" onClick={() => onPick(d)}>
          <strong>{d.name}</strong>
          <DrillMeta drill={d} favorite={favorites.has(d.id)} hidden={hidden.has(d.id)} />
        </button>
        {action?.(d)}
      </div>
    ))
  if (!grouped) return <div className="card flat">{rows(drills)}</div>
  // One sticky heading per category that has drills, in the usual category order.
  const known = new Set(CATEGORIES.map((c) => c.id))
  const groups = [
    ...CATEGORIES.map((c) => ({ id: c.id, label: c.label, list: drills.filter((d) => d.category === c.id) })),
    { id: 'other', label: 'Other', list: drills.filter((d) => !known.has(d.category)) },
  ].filter((g) => g.list.length > 0)
  return (
    <div className="drill-groups">
      {groups.map((g) => (
        <section key={g.id} className="drill-group" aria-labelledby={`cat-${g.id}`}>
          <h2 className="drill-group-head" id={`cat-${g.id}`}>
            {g.label} <span>{g.list.length}</span>
          </h2>
          <div className="card flat">{rows(g.list)}</div>
        </section>
      ))}
    </div>
  )
}

// Favorite and "Don't suggest this" for one drill, saved on the team.
export function DrillPrefs({ team, drillId, small = false, onChange }) {
  const fav = (team.favorites ?? []).includes(drillId)
  const hid = (team.hidden ?? []).includes(drillId)
  const cls = `btn quiet${small ? ' small' : ''}`
  const flip = async (list) => {
    const on = await toggleTeamList(team.id, list, drillId)
    onChange?.(list, on)
  }
  return (
    <>
      <button type="button" className={cls} aria-pressed={fav} onClick={() => flip('favorites')}>
        {fav ? '★ Favorite' : '☆ Favorite'}
      </button>
      <button type="button" className={cls} aria-pressed={hid} onClick={() => flip('hidden')}>
        {hid ? 'Suggest it again' : "Don't suggest this"}
      </button>
    </>
  )
}

export function DrillFilters({ team, value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  // Shown only once the coach has favorites, hidden drills or drills of their own.
  const hasMine = (team.favorites?.length ?? 0) + (team.hidden?.length ?? 0) + customDrills().length > 0
  return (
    <div className="stack">
      <input type="search" placeholder="Search drills" value={value.query} onChange={set('query')} aria-label="Search drills" />
      {(hasMine || value.show) && (
        <select value={value.show ?? ''} onChange={set('show')} aria-label="Show">
          <option value="">All drills</option>
          <option value="favorites">Favorites</option>
          <option value="hidden">Not suggested</option>
          <option value="yours">Your own drills</option>
        </select>
      )}
      <div className="row">
        <select value={value.category} onChange={set('category')} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select value={value.level} onChange={set('level')} aria-label="Difficulty">
          <option value="">All levels</option>
          {LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <select value={value.need} onChange={set('need')} aria-label="Builds this need">
        <option value="">Any need</option>
        {needsForDivision(team.division, DRILLS).map((n) => (
          <option key={n.id} value={n.id}>
            {n.label}
          </option>
        ))}
      </select>
      <label className="toggle">
        <span className="t-text">
          Only drills for my team
          <span>
            {sportLabel(sportOf(team))}, {team.division} and your game rules
          </span>
        </span>
        <input type="checkbox" className="switch" checked={value.fitsTeam} onChange={set('fitsTeam')} />
      </label>
    </div>
  )
}

const emptyFilters = { query: '', category: '', need: '', level: '', fitsTeam: true, show: '' }

export default function Drills({ team }) {
  const [filters, setFilters] = useState(() => ({ ...emptyFilters, ...store.get('drillFilters', {}), query: '' }))
  const update = (f) => {
    setFilters(f)
    store.set('drillFilters', { ...f, query: '' })
  }
  // Re-read when the coach's own drills change.
  const mine = useLiveQuery(() => db.customDrills.toArray(), [])
  const list = useMemo(() => filterDrills(allDrills(), { team, ...filters }), [team, filters, mine]) // eslint-disable-line react-hooks/exhaustive-deps
  const unhide = (d) =>
    filters.show === 'hidden' ? (
      <button className="btn quiet small" onClick={() => toggleTeamList(team.id, 'hidden', d.id)} aria-label={`Suggest ${d.name} again`}>
        Suggest again
      </button>
    ) : null
  const showAll = () => update({ ...filters, show: '' })
  const emptyFor =
    filters.show === 'favorites'
      ? { text: 'Drills you star will appear here. Open any drill and tap Favorite.', action: { label: 'Show all drills', onClick: showAll } }
      : filters.show === 'hidden'
        ? { text: 'Drills you tell AttaCoach not to suggest will appear here.', action: { label: 'Show all drills', onClick: showAll } }
        : filters.show === 'yours'
          ? { text: 'Drills you add will appear here.', action: { label: 'Add your own drill', onClick: () => go('mydrill/new') } }
          : { text: 'No drills match these filters.', action: { label: 'Clear filters', onClick: () => update({ ...emptyFilters }) } }
  return (
    <>
      <TeamHeader team={team} title="Drills" />
      <main className="page">
        <DrillFilters team={team} value={filters} onChange={update} />
        <div className="row">
          <p className="muted small spacer">
            {list.length} {list.length === 1 ? 'drill' : 'drills'}
          </p>
          <button className="btn quiet small" onClick={() => go('mydrill/new')}>
            Add your own drill
          </button>
        </div>
        <DrillList drills={list} team={team} onPick={(d) => go(`drill/${d.id}`)} action={filters.show === 'hidden' ? unhide : null} empty={emptyFor} grouped />
      </main>
    </>
  )
}

export function DrillPage({ drillId, team }) {
  const drill = drillFor(drillById(drillId), team)
  if (!drill) {
    return (
      <>
        <TeamHeader team={team} title="Drill" backTo="drills" />
        <main className="page">
          <p className="empty">That drill isn't in the library.</p>
        </main>
      </>
    )
  }
  if (drill.deleted) {
    return (
      <>
        <TeamHeader team={team} title={drill.name} backTo="drills" />
        <main className="page">
          <p className="empty">You deleted this drill. Plans that used it still show its name.</p>
        </main>
      </>
    )
  }
  const fits = fitsDivision(drill, team.division)
  const sportOk = sportFits(drill, team)
  const allowed = rulesAllow(drill, team.rules)
  const aboveLevel = levelIndex(drill.level) > levelIndex(MAX_LEVEL_FOR[team.experience] ?? 'advanced')
  return (
    <>
      <TeamHeader team={team} title={drill.name} backTo="drills" />
      <main className="page">
        <div className="card">
          <DrillMeta drill={drill} />
          {!sportOk && <p className="note">Written for {writtenFor(drill)}, so plans for your team leave it out.</p>}
          {!fits && <p className="note">Made for {drill.ages[0]}–{drill.ages[1]}, not {team.division}.</p>}
          {!allowed && <p className="note">Your game rules are set so this doesn't come up in games.</p>}
          {sportOk && fits && allowed && aboveLevel && (
            <p className="note">This one is rated {drill.level}. Plans won't include it for your experience setting, but you can add it to a plan yourself.</p>
          )}
          <DrillText drill={drill} sport={sportOf(team)} />
        </div>
        <div className="action-row">
          <DrillPrefs team={team} drillId={drill.id} />
        </div>
        {(team.hidden ?? []).includes(drill.id) && <p className="small muted">Plans won't pick this one. You can still add it to a plan yourself.</p>}
        {drill.custom && (
          <div className="action-row">
            <button className="btn quiet" onClick={() => go(`mydrill/${drill.id}`)}>
              Edit
            </button>
            <button
              className="btn quiet"
              onClick={async () => {
                if (!window.confirm(`Delete ${drill.name}? Plans that already use it keep it, marked as a deleted drill.`)) return
                await deleteCustomDrill(drill.id)
                go('drills')
              }}
            >
              Delete
            </button>
          </div>
        )}
      </main>
    </>
  )
}

const blankDrill = { name: '', category: 'team', minutes: 10, needs: [], where: ['field'], group: 'small', steps: '' }

// Add or edit one of the coach's own drills. id is 'new' or a saved drill's id.
export function MyDrillForm({ id, team }) {
  const existing = useLiveQuery(() => (id === 'new' ? null : db.customDrills.get(id)), [id])
  if (id !== 'new' && existing === undefined) return <TeamHeader team={team} title="Your drill" backTo="drills" />
  const initial = existing ? { ...existing, steps: (existing.steps ?? []).join('\n') } : blankDrill
  return <MyDrillFields key={id} team={team} initial={initial} isNew={!existing} />
}

function MyDrillFields({ team, initial, isNew }) {
  const [d, setD] = useState(initial)
  const set = (patch) => setD((cur) => ({ ...cur, ...patch }))
  const needs = needsForDivision(team.division, DRILLS).length ? needsForDivision(team.division, DRILLS) : NEEDS
  const save = async () => {
    const row = await saveCustomDrill({
      ...d,
      name: d.name.trim().replace(/\s+/g, ' '),
      minutes: Math.max(2, Math.min(30, Math.round(Number(d.minutes) || 10))),
      steps: d.steps.split('\n').map((x) => x.trim()).filter(Boolean),
    })
    go(`drill/${row.id}`)
  }
  return (
    <>
      <TeamHeader team={team} title={isNew ? 'Add your own drill' : 'Edit your drill'} backTo="drills" />
      <main className="page">
        <section className="card">
          <label className="field">
            Name
            <input type="text" value={d.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Two-ball relay" />
          </label>
          <label className="field">
            Category
            <select value={d.category} onChange={(e) => set({ category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Minutes
            <input type="number" inputMode="numeric" min={2} max={30} value={d.minutes} onChange={(e) => set({ minutes: e.target.value })} />
          </label>
          <div className="stack">
            <strong className="small">What it works on</strong>
            <SkillChips options={needs} value={d.needs} onChange={(v) => set({ needs: v })} label="What it works on" />
          </div>
          <div className="stack">
            <strong className="small">Where it can be run</strong>
            <SkillChips options={SPACES} value={d.where} onChange={(v) => set({ where: v.length ? v : d.where })} label="Where it can be run" />
          </div>
          <div className="stack">
            <strong className="small">Group</strong>
            <div className="seg" role="group" aria-label="Group">
              {[
                ['small', 'Small group'],
                ['team', 'Whole team'],
              ].map(([v, label]) => (
                <button key={v} type="button" aria-pressed={d.group === v} onClick={() => set({ group: v })}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            Steps, one per line
            <textarea rows={5} value={d.steps} onChange={(e) => set({ steps: e.target.value })} placeholder={'Split into two lines.\nFirst one through the cones wins.'} />
          </label>
          <div className="action-row">
            <button className="btn" disabled={!d.name.trim()} onClick={save}>
              Save drill
            </button>
            <button className="btn quiet" onClick={() => go('drills')}>
              Cancel
            </button>
          </div>
        </section>
      </main>
    </>
  )
}
