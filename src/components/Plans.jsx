import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db.js'
import { totalMinutes } from '../lib/plan.js'
import { needLabel } from '../data/constants.js'
import { go } from '../lib/route.js'
import { TeamHeader } from './Header.jsx'
import { planDate, sortPlans } from './Today.jsx'

export default function Plans({ team }) {
  const plans = useLiveQuery(
    () => db.plans.where('teamId').equals(team.id).toArray().then(sortPlans),
    [team.id],
  )
  if (!plans) return <TeamHeader team={team} title="Plans" />
  return (
    <>
      <TeamHeader team={team} title="Plans" />
      <main className="page">
        {plans.length === 0 ? (
          <div className="card empty">
            <h2>No plans yet</h2>
            <p className="muted">Build your first practice plan on the Today tab. It takes about a minute.</p>
            <button className="btn" onClick={() => go('today')}>
              Plan a practice
            </button>
          </div>
        ) : (
          <div className="card flat">
            {plans.map((p) => (
              <button key={p.id} className="drill-row" onClick={() => go(`plan/${p.id}`)}>
                <strong>
                  {planDate(p)}, {totalMinutes(p)} minutes
                </strong>
                <span className="meta">
                  Focus: {p.focus.map(needLabel).join(', ') || 'general'}
                </span>
              </button>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
