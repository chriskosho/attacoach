import { back, go } from '../lib/route.js'
import { TabIcon } from './Icons.jsx'

export function TeamHeader({ team, title, backTo }) {
  return (
    <header className="top">
      {backTo && (
        <button className="back no-print" onClick={() => back(backTo)} aria-label="Back">
          ‹ Back
        </button>
      )}
      <h1>{title ?? team.name}</h1>
      <span className="div-badge" aria-label={`Division ${team.division}`}>
        {team.division}
      </span>
      {!backTo && (
        <button className="gear no-print" onClick={() => go('settings')} aria-label="Settings">
          <TabIcon name="settings" />
        </button>
      )}
    </header>
  )
}
