import { useCallback, useEffect, useRef, useState } from 'react'
import { PLAYER_RATINGS, POSITIONS, needsForDivision, positionShort } from '../data/constants.js'
import { DRILLS } from '../data/drills.js'
import { blankPlayer, playerName, playerSummary } from '../lib/roster.js'
import SkillChips from './SkillChips.jsx'
import Sheet from './Sheet.jsx'

const ratingLabel = (id) => PLAYER_RATINGS.find((r) => r.id === id)?.label ?? id

// A roster the coach can fill in quickly. "Add player" opens a short popup: the name first, then
// strengths and needs work, then "Save and add next" or "Save and finish". Tapping a player later
// reopens the same details to edit. Controlled: the parent owns the list and decides where it is stored.
export default function Roster({ division, players, onChange }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  // The wizard can add several players before the parent has re-rendered, so keep the newest list.
  const latest = useRef(players)
  latest.current = players

  const add = useCallback(
    (p) => {
      const next = [...latest.current, p]
      latest.current = next
      onChange(next)
    },
    [onChange],
  )
  const closeAdd = useCallback(() => setAdding(false), [])

  const save = (p) => {
    onChange(players.map((x) => (x.id === p.id ? p : x)))
    setEditing(null)
  }
  const remove = (id) => {
    onChange(players.filter((x) => x.id !== id))
    setEditing(null)
  }

  return (
    <div className="stack">
      <button type="button" className="btn" onClick={() => setAdding(true)}>
        {players.length === 0 ? 'Add a player' : 'Add another player'}
      </button>

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
        {players.length === 0 ? 'Only a first name is needed. Everything else is optional.' : `${players.length} ${players.length === 1 ? 'player' : 'players'}. Tap a name to change anything.`}
      </p>

      {adding && <AddPlayerWizard division={division} count={players.length} onAdd={add} onClose={closeAdd} />}
      {editing && <PlayerEditor key={editing.id} division={division} player={editing} onSave={save} onRemove={remove} onClose={() => setEditing(null)} />}
    </div>
  )
}

// Strengths, needs work, overall level and positions. Shared by the add wizard and the editor.
function SkillFields({ division, p, set }) {
  const skills = needsForDivision(division, DRILLS)
  // A skill is a strength or a weakness, not both.
  const setStrengths = (strengths) => set({ strengths, weaknesses: p.weaknesses.filter((n) => !strengths.includes(n)) })
  const setWeaknesses = (weaknesses) => set({ weaknesses, strengths: p.strengths.filter((n) => !weaknesses.includes(n)) })
  return (
    <>
      <div className="stack">
        <strong className="small">Strengths</strong>
        <SkillChips options={skills} value={p.strengths} onChange={setStrengths} label="Strengths" />
      </div>
      <div className="stack">
        <strong className="small">Needs work</strong>
        <SkillChips options={skills} value={p.weaknesses} onChange={setWeaknesses} label="Needs work" />
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
        <strong className="small">Positions</strong>
        <span className="small muted">Pick as many as fit. Three is a good number to start with. Pitcher means the player can pitch.</span>
        <SkillChips options={POSITIONS} value={p.positions} onChange={(positions) => set({ positions })} label="Positions" />
      </div>
    </>
  )
}

// Step 1: name. Step 2: skills. Then add the next player or finish. Nothing is required but a first name.
function AddPlayerWizard({ division, count, onAdd, onClose }) {
  const [step, setStep] = useState(1)
  const [p, setP] = useState(blankPlayer)
  const [added, setAdded] = useState([])
  const nameRef = useRef(null)
  const set = (patch) => setP((cur) => ({ ...cur, ...patch }))

  // Back to the name box for each new player (this runs after the sheet's own focus call).
  useEffect(() => {
    if (step === 1) nameRef.current?.focus()
  }, [step, added.length])

  const ok = p.first.trim().length > 0
  const finished = () => {
    // "Sam Lee" typed in the first-name box fills both names.
    const [first, ...rest] = p.first.trim().replace(/\s+/g, ' ').split(' ')
    return { ...p, first, last: p.last.trim() || rest.join(' ') }
  }
  const commit = (andNext) => {
    const player = finished()
    onAdd(player)
    if (andNext) {
      setAdded((a) => [...a, playerName(player)])
      setP(blankPlayer())
      setStep(1)
    } else onClose()
  }
  const next = (e) => {
    e.preventDefault()
    if (ok) setStep(2)
  }

  const who = step === 2 ? playerName(finished()) : ''
  return (
    <Sheet title="Add a player" onClose={onClose}>
      <div className="stack">
        <p className="small muted" style={{ margin: 0 }}>
          Player {count + 1} · Step {step} of 2
        </p>
        {added.length > 0 && step === 1 && (
          <p className="suggest" role="status">
            Added {added[added.length - 1]}. Who's next?
          </p>
        )}

        {step === 1 ? (
          <form className="stack" onSubmit={next}>
            <div className="action-row">
              <label className="field">
                First name
                <input ref={nameRef} type="text" value={p.first} maxLength={40} autoComplete="off" onChange={(e) => set({ first: e.target.value })} />
              </label>
              <label className="field">
                Last name (optional)
                <input type="text" value={p.last} maxLength={40} autoComplete="off" onChange={(e) => set({ last: e.target.value })} />
              </label>
            </div>
            <div className="action-row">
              <button className="btn" type="submit" disabled={!ok}>
                Next
              </button>
              <button className="btn quiet" type="button" disabled={!ok} onClick={() => commit(true)}>
                Save without details
              </button>
            </div>
            {added.length > 0 && (
              <button className="btn quiet" type="button" onClick={onClose}>
                Done
              </button>
            )}
          </form>
        ) : (
          <div className="stack">
            <h3 style={{ margin: 0 }}>What about {who}?</h3>
            <SkillFields division={division} p={p} set={set} />
            <div className="stack wizard-actions">
              <div className="action-row">
                <button className="btn" type="button" onClick={() => commit(true)}>
                  Save and add next
                </button>
                <button className="btn quiet" type="button" onClick={() => commit(false)}>
                  Save and finish
                </button>
              </div>
              <button className="btn quiet small" type="button" onClick={() => setStep(1)}>
                Back to name
              </button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}

export function PlayerEditor({ division, player, onSave, onRemove, onClose }) {
  const [p, setP] = useState(player)
  const set = (patch) => setP((cur) => ({ ...cur, ...patch }))
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

        <SkillFields division={division} p={p} set={set} />

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
