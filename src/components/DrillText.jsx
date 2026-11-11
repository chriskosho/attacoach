import { DrillVisual } from './DrillDiagram.jsx'
import { categoryLabel, needLabel, LEVELS, RULES } from '../data/constants.js'
import { drillFor, ruleText } from '../lib/sport.js'

export function LevelTag({ level }) {
  const label = LEVELS.find((l) => l.id === level)?.label ?? level
  return <span className={`level ${level}`}>{label}</span>
}

export function DrillMeta({ drill }) {
  return (
    <span className="meta">
      <span>{categoryLabel(drill.category)}</span>
      <LevelTag level={drill.level} />
      <span>
        {drill.ages[0] === drill.ages[1] ? drill.ages[0] : `${drill.ages[0]}–${drill.ages[1]}`}
      </span>
      <span>{drill.minutes} min</span>
    </span>
  )
}

// Full drill write-up. New coaches see everything; experienced coaches get the short version
// unless they ask for more. `sport` picks the wording: softball teams see the drill's softball text.
export function DrillText({ drill: base, compact = false, sport = 'baseball' }) {
  const drill = drillFor(base, sport)
  const rules = (drill.requires ?? []).map((r) => RULES.find((x) => x.id === r)).filter(Boolean).map((r) => ruleText(r, sport).label)
  return (
    <div className="drill-text stack">
      {!compact && (
        <section>
          <h4>Setup</h4>
          <p>{drill.setup}</p>
        </section>
      )}
      <DrillVisual drill={drill} compact={compact} sport={sport} />
      <section>
        <h4>How it works</h4>
        <ol>
          {drill.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </section>
      <section>
        <h4>Coaching points</h4>
        <ul>
          {drill.points.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </section>
      {!compact && (
        <>
          <section>
            <h4>Make it easier</h4>
            <p>{drill.easier}</p>
          </section>
          <section>
            <h4>Make it harder</h4>
            <p>{drill.harder}</p>
          </section>
          <section>
            <h4>Equipment</h4>
            <p>{drill.equipment.join(', ')}</p>
          </section>
        </>
      )}
      <div className="tags">
        {drill.needs.map((n) => (
          <span className="tag" key={n}>
            {needLabel(n)}
          </span>
        ))}
        {rules.map((r) => (
          <span className="tag" key={r}>
            Needs: {r.toLowerCase()}
          </span>
        ))}
        <span className="tag">{drill.group === 'team' ? 'Whole team' : 'Small group or station'}</span>
      </div>
    </div>
  )
}
