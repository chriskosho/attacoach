import { useState } from 'react'
import { PLAYER_RATINGS, POSITIONS, needsForDivision, positionShort } from '../data/constants.js'
import { DRILLS } from '../data/drills.js'
import { blankPlayer, playerName, playerSummary } from '../lib/roster.js'
import SkillChips from './SkillChips.jsx'
import Sheet from './Sheet.jsx'

const ratingLabel = (id) => PLAYER_RATINGS.find((r) => r.id === id)?.label ?? id

// A roster the coach can fill in quickly: type a first name and press Add, then tap a
// player to add a rating, strengths, weaknesses and positions. Controlled: the parent
// owns the list and decides where it is stored.
export default function Roster({ division, players, onChange }) {
  const [first, setFirst] = useState('')
  const [editing, setEditing] = useState(null)

  const quickAdd = (e) => {
    e.preventDefault()
    const name = first.trim().replace(/\s+/g, ' ')
    if (!name) return
    // "Sam Lee" in the quick box fills both names.
    const [f, ...rest] = name.split(' ')
    onChange([...players, { ...blankPlayer(), first: f, last: rest.join(' ') }])
    setFirst('')
  }

  const save = (p) => {
    onChange(players.some((x) => x.id === p.id) ? players.map((x) => (x.id === p.id ? p : x)) : [...players, p])
    setEditing(null)
  }
  const remove = (id) => {
    onChange(players.filter((x) => x.id !== id))
    setEditing(null)
  }

  return (
    <div className="stack">
      <form className="quick-add" onSubmit={quickAdd}>
        <label className="field grow">
          Add a player
          <input type="text" value={first} maxLength={40} placeholder="First name" autoComplete="off" onChange={(e) => setFirst(e.target.value)} />
        </label>
        <button className="btn" type="submit" disabled={!first.trim()}>
          Add
        </button>
      </form>

      {players.length > 0 && (
        <ul className="roster" aria-label="Players">
          {players.map((p) => (
            <li key={p.id}>
              <button type="button" className="player-row" onClick={() => setEditing(p)} aria-label={`Edit ${playerName(p)}`}>
                <strong>{playerName(p)}</strong>
                <span className="small muted">{playerSummary(p, positionShort, ratingLabel) || 'Tap to add details'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="small muted" style={{ margin: 0 }}>
        {players.length === 0 ? 'Only a first name is needed. Add details whenever you like.' : `${players.length} ${players.length === 1 ? 'player' : 'players'}. Tap a name to add a rating, strengths, weaknesses and positions.`}
      </p>

      {editing && <PlayerEditor key={editing.id} division={division} player={editing} isNew={false} onSave={save} onRemove={remove} onClose={() => setEditing(null)} />}
    </div>
  )
}

export function PlayerEditor({ division, player, onSave, onRemove, onClose }) {
  const [p, setP] = useState(player)
  const skills = needsForDivision(division, DRILLS)
  const set = (patch) => setP((cur) => ({ ...cur, ...patch }))

  // A skill is a strength or a weakness, not both.
  const setStrengths = (strengths) => set({ strengths, weaknesses: p.weaknesses.filter((n) => !strengths.includes(n)) })
  const setWeaknesses = (weaknesses) => set({ weaknesses, strengths: p.strengths.filter((n) => !weaknesses.includes(n)) })

  const ok = p.first.trim().length > 0
  return (
    <Sheet title={playerName(player) || 'Player'} onClose={onClose}>
      <div className="stack">
        <div className="action-row">
          <label className="field">
            First name
            <input type="text" value={p.first} maxLength={40} onChange={(e) => set({ first: e.target.value })} />
          </label>
          <label className="field">
            Last name (optional)
            <input type="text" value={p.last} maxLength={40} onChange={(e) => set({ last: e.target.value })} />
          </label>
        </div>

        <div className="stack">
          <strong className="small" id="rating-label">
            Overall
          </strong>
          <div className="seg" role="group" aria-labelledby="rating-label">
            {PLAYER_RATINGS.map((r) => (
              <button key={r.id} type="button" aria-pressed={p.rating === r.id} onClick={() => set({ rating: p.rating === r.id ? null : r.id })}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="stack">
          <strong className="small">Strengths</strong>
          <SkillChips options={skills} value={p.strengths} onChange={setStrengths} label="Strengths" />
        </div>
        <div className="stack">
          <strong className="small">Needs work</strong>
          <SkillChips options={skills} value={p.weaknesses} onChange={setWeaknesses} label="Needs work" />
        </div>
        <div className="stack">
          <strong className="small">Positions</strong>
          <span className="small muted">Pick as many as fit. Three is a good number to start with. Pitcher means the player can pitch.</span>
          <SkillChips options={POSITIONS} value={p.positions} onChange={(positions) => set({ positions })} label="Positions" />
        </div>

        <div className="action-row">
          <button className="btn" disabled={!ok} onClick={() => onSave({ ...p, first: p.first.trim(), last: p.last.trim() })}>
            Save player
          </button>
          <button className="btn danger" onClick={() => onRemove(p.id)}>
            Remove
          </button>
        </div>
      </div>
    </Sheet>
  )
}
