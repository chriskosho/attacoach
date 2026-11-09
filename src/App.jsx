import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './lib/db.js'
import { useRoute, go } from './lib/route.js'
import { onUpdateReady, applyUpdate } from './lib/updates.js'
import Setup from './components/Setup.jsx'
import Today from './components/Today.jsx'
import Plans from './components/Plans.jsx'
import PlanView from './components/PlanView.jsx'
import Drills, { DrillPage } from './components/Drills.jsx'
import TeamPage from './components/TeamPage.jsx'
import RunTimer from './components/RunTimer.jsx'
import { TabIcon } from './components/Icons.jsx'

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'plans', label: 'Plans' },
  { id: 'drills', label: 'Drills' },
  { id: 'team', label: 'Team' },
]

const TAB_FOR = { plan: 'plans', run: 'plans', drill: 'drills', setup: 'team' }

export default function App() {
  const route = useRoute()
  const data = useLiveQuery(async () => {
    const [teams, current, theme] = await Promise.all([
      db.teams.toArray(),
      db.settings.get('currentTeamId'),
      db.settings.get('theme'),
    ])
    return { teams, currentId: current?.value ?? null, theme: theme?.value ?? 'system' }
  }, [])
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => onUpdateReady(() => setUpdateReady(true)), [])

  useEffect(() => {
    const t = data?.theme
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t
    else delete document.documentElement.dataset.theme
  }, [data?.theme])

  if (!data) return null

  const team = data.teams.find((t) => t.id === data.currentId) ?? data.teams[0] ?? null

  // First run: set up a team before anything else.
  if (!team) return <Setup onDone={() => go('today')} first />

  if (route.name === 'setup') {
    const editing = route.id === 'new' ? null : data.teams.find((t) => t.id === route.id) ?? team
    return <Setup team={editing} onDone={() => go('team')} onCancel={() => go('team')} />
  }

  if (route.name === 'run' && route.id) return <RunTimer planId={route.id} team={team} />

  const tab = TAB_FOR[route.name] ?? route.name
  let page
  if (route.name === 'plan' && route.id) page = <PlanView planId={route.id} team={team} />
  else if (route.name === 'drill' && route.id) page = <DrillPage drillId={route.id} team={team} />
  else if (route.name === 'plans') page = <Plans team={team} />
  else if (route.name === 'drills') page = <Drills team={team} />
  else if (route.name === 'team') page = <TeamPage team={team} teams={data.teams} theme={data.theme} />
  else page = <Today team={team} />

  return (
    <div className="app">
      {page}
      {updateReady && (
        <div className="update-bar no-print" role="status">
          <span className="spacer">A new version of AttaCoach is ready.</span>
          <button className="btn" onClick={applyUpdate}>
            Reload
          </button>
        </div>
      )}
      <nav className="tabs no-print" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
            <TabIcon name={t.id} />
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
