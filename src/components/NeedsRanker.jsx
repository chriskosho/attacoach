import { NEEDS, needsForDivision } from '../data/constants.js'
import { DRILLS } from '../data/drills.js'

// Pick every skill that applies, then rank them. Tapping a skill in the bank moves it
// to the bottom of the ordered list; the arrows reorder it and the x returns it to the bank.
export default function NeedsRanker({ division, value, onChange }) {
  const options = needsForDivision(division, DRILLS)
  const label = (id) => NEEDS.find((n) => n.id === id)?.label ?? id
  const bank = options.filter((n) => !value.includes(n.id))

  const add = (id) => onChange([...value, id])
  const remove = (id) => onChange(value.filter((n) => n !== id))
  const move = (i, delta) => {
    const j = i + delta
    if (j < 0 || j >= value.length) return
    const next = [...value]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="ranker">
      <div className="ranker-list">
        <strong className="small">Your list, most important first</strong>
        {value.length === 0 ? (
          <p className="muted small ranker-empty">Tap the skills below to add them here.</p>
        ) : (
          <ol aria-label="Ranked skills">
            {value.map((id, i) => (
              <li key={id} className="ranked">
                <span className="rank">{i + 1}</span>
                <span className="r-label">{label(id)}</span>
                <span className="r-tools">
                  <button type="button" aria-label={`Move ${label(id)} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                    ▲
                  </button>
                  <button type="button" aria-label={`Move ${label(id)} down`} disabled={i === value.length - 1} onClick={() => move(i, 1)}>
                    ▼
                  </button>
                  <button type="button" aria-label={`Remove ${label(id)}`} onClick={() => remove(id)}>
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="stack">
        <strong className="small">{bank.length ? 'Tap to add' : 'Everything is on your list'}</strong>
        {bank.length > 0 && (
          <div className="chips" role="group" aria-label="Skills to add">
            {bank.map((n) => (
              <button key={n.id} type="button" className="chip" title={n.help} onClick={() => add(n.id)}>
                {n.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
