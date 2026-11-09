import { useMemo, useState } from 'react'
import { DRILLS, drillById } from '../data/drills.js'
import { CATEGORIES, LEVELS, needsForDivision, MAX_LEVEL_FOR, levelIndex } from '../data/constants.js'
import { fitsDivision, rulesAllow } from '../lib/plan.js'
import { go, store } from '../lib/route.js'
import { TeamHeader } from './Header.jsx'
import { DrillMeta, DrillText } from './DrillText.jsx'

export function filterDrills(drills, { team, query = '', category = '', need = '', level = '', fitsTeam = true }) {
  const q = query.trim().toLowerCase()
  return drills.filter((d) => {
    if (fitsTeam && !(fitsDivision(d, team.division) && rulesAllow(d, team.rules))) return false
    if (category && d.category !== category) return false
    if (need && !d.needs.includes(need)) return false
    if (level && d.level !== level) return false
    if (q && !(d.name.toLowerCase().includes(q) || d.setup.toLowerCase().includes(q) || d.steps.join(' ').toLowerCase().includes(q))) return false
    return true
  })
}

export function DrillList({ drills, onPick }) {
  if (!drills.length) return <p className="muted empty">No drills match. Try clearing a filter.</p>
  return (
    <div className="card flat">
      {drills.map((d) => (
        <button key={d.id} className="drill-row" onClick={() => onPick(d)}>
          <strong>{d.name}</strong>
          <DrillMeta drill={d} />
        </button>
      ))}
    </div>
  )
}

export function DrillFilters({ team, value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  return (
    <div className="stack">
      <input type="search" placeholder="Search drills" value={value.query} onChange={set('query')} aria-label="Search drills" />
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
            {team.division} and your game rules
          </span>
        </span>
        <input type="checkbox" className="switch" checked={value.fitsTeam} onChange={set('fitsTeam')} />
      </label>
    </div>
  )
}

const emptyFilters = { query: '', category: '', need: '', level: '', fitsTeam: true }

export default function Drills({ team }) {
  const [filters, setFilters] = useState(() => ({ ...emptyFilters, ...store.get('drillFilters', {}), query: '' }))
  const update = (f) => {
    setFilters(f)
    store.set('drillFilters', { ...f, query: '' })
  }
  const list = useMemo(() => filterDrills(DRILLS, { team, ...filters }), [team, filters])
  return (
    <>
      <TeamHeader team={team} title="Drills" />
      <main className="page">
        <DrillFilters team={team} value={filters} onChange={update} />
        <p className="muted small">
          {list.length} {list.length === 1 ? 'drill' : 'drills'}
        </p>
        <DrillList drills={list} onPick={(d) => go(`drill/${d.id}`)} />
      </main>
    </>
  )
}

export function DrillPage({ drillId, team }) {
  const drill = drillById(drillId)
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
  const fits = fitsDivision(drill, team.division)
  const allowed = rulesAllow(drill, team.rules)
  const aboveLevel = levelIndex(drill.level) > levelIndex(MAX_LEVEL_FOR[team.experience] ?? 'advanced')
  return (
    <>
      <TeamHeader team={team} title={drill.name} backTo="drills" />
      <main className="page">
        <div className="card">
          <DrillMeta drill={drill} />
          {!fits && <p className="note">Made for {drill.ages[0]}–{drill.ages[1]}, not {team.division}.</p>}
          {!allowed && <p className="note">Your game rules are set so this doesn't come up in games.</p>}
          {fits && allowed && aboveLevel && (
            <p className="note">This one is rated {drill.level}. Plans won't include it for your experience setting, but you can add it to a plan yourself.</p>
          )}
          <DrillText drill={drill} />
        </div>
      </main>
    </>
  )
}
