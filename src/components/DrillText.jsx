import { DrillVisual } from './DrillDiagram.jsx'
import { categoryLabel, needLabel, LEVELS, RULES } from '../data/constants.js'
import { drillFor, ruleText } from '../lib/sport.js'

export function LevelTag({ level }) {
  const label = LEVELS.find((l) => l.id === level)?.label ?? level
  return <span className={`level ${level}`}>{label}</span>
}

// Category, level, ages and time on one wrapping line, with a dot between the items.
export function DrillMeta({ drill, favorite = false, hidden = false }) {
  const items = [
    <span key="cat">{categoryLabel(drill.category)}</span>,
    drill.custom ? <span key="lvl" className="mark yours">Yours</span> : <LevelTag key="lvl" level={drill.level} />,
    !drill.custom && <span key="ages">{drill.ages[0] === drill.ages[1] ? drill.ages[0] : `${drill.ages[0]}–${drill.ages[1]}`}</span>,
    <span key="min">{drill.minutes} min</span>,
    favorite && <span key="fav" className="mark fav">Favorite</span>,
    hidden && <span key="hid" className="mark hid">Not suggested</span>,
  ].filter(Boolean)
  return (
    <span className="meta">
      {items.map((el, i) => [
        i > 0 && (
          <span key={`s${i}`} className="sep" aria-hidden="true">
            {' · '}
          </span>
        ),
        el,
      ])}
    </span>
  )
}

// Full drill write-up. New coaches see everything; experienced coaches get the short version
// unless they ask for more. `sport` picks the wording: softball teams see the drill's softball text.
export function DrillText({ drill: base, compact = false, sport = 'baseball', level = 2 }) {
  const H = `h${level}`
  const drill = drillFor(base, sport)
  const rules = (drill.requires ?? []).map((r) => RULES.find((x) => x.id === r)).filter(Boolean).map((r) => ruleText(r, sport).label)
  return (
    <div className="drill-text stack">
      {!compact && drill.setup && (
        <section>
          <H>Setup</H>
          <p>{drill.setup}</p>
        </section>
      )}
      <DrillVisual drill={drill} compact={compact} sport={sport} />
      <section>
        <H>How it works</H>
        <ol>
          {drill.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </section>
      {drill.points.length > 0 && (
        <section>
          <H>Coaching points</H>
          <ul>
            {drill.points.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      )}
      {!compact && (
        <>
          {drill.easier && (
            <section>
              <H>Make it easier</H>
              <p>{drill.easier}</p>
            </section>
          )}
          {drill.harder && (
            <section>
              <H>Make it harder</H>
              <p>{drill.harder}</p>
            </section>
          )}
          {drill.equipment.length > 0 && (
            <section>
              <H>Equipment</H>
              <p>{drill.equipment.join(', ')}</p>
            </section>
          )}
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
