import { back } from '../lib/route.js'

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
    </header>
  )
}
