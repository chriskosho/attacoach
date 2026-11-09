import { HUDDLES, MOMENTS, GUIDES, fillFocus } from '../data/coaching.js'
import { bandFor } from '../data/motivation.js'
import { focusSummary, starterNeeds } from '../data/constants.js'
import { TeamHeader } from './Header.jsx'

// Huddle talking points as a short list. Bullets, not a script: say it your way.
export function HuddlePoints({ kind, team, focus }) {
  const h = HUDDLES[kind]
  const band = bandFor(team.division)
  const f = focusSummary(focus ?? (team.needs?.length ? team.needs : starterNeeds(team.division))).toLowerCase()
  return (
    <ul className="huddle-points">
      {h[band].map((b) => (
        <li key={b}>{fillFocus(b, f)}</li>
      ))}
    </ul>
  )
}

export function SayThis({ cue }) {
  return (
    <div className="say-this">
      <div>
        <span className="say-label">Say</span> “{cue.say}”
      </div>
      <div className="say-not">
        <span className="say-label">Not</span> “{cue.not}”
      </div>
      <div className="small muted">{cue.why}</div>
    </div>
  )
}

const GAME_DAY = ['preGame', 'postGameWin', 'postGameLoss']
const PRACTICE = ['practiceOpen', 'practiceClose']

export default function CoachCorner({ team }) {
  return (
    <>
      <TeamHeader team={team} title="Coach Corner" />
      <main className="page">
        <p className="muted" style={{ margin: 0 }}>
          Talking points, not scripts. Read them over, then say them your way.
        </p>

        <section className="card" aria-labelledby="gameday">
          <h2 id="gameday">Game day huddles</h2>
          {GAME_DAY.map((k) => (
            <details key={k} className="coach-item">
              <summary>
                {HUDDLES[k].title} <span className="small muted">{HUDDLES[k].when}</span>
              </summary>
              <HuddlePoints kind={k} team={team} />
            </details>
          ))}
        </section>

        <section className="card" aria-labelledby="practice-huddles">
          <h2 id="practice-huddles">Practice huddles</h2>
          <p className="small muted" style={{ margin: 0 }}>
            These also show up in every practice plan, filled in with that day’s focus.
          </p>
          {PRACTICE.map((k) => (
            <details key={k} className="coach-item">
              <summary>
                {HUDDLES[k].title} <span className="small muted">{HUDDLES[k].when}</span>
              </summary>
              <HuddlePoints kind={k} team={team} />
            </details>
          ))}
        </section>

        <section className="card" aria-labelledby="moments">
          <h2 id="moments">Say this, not that</h2>
          <p className="small muted" style={{ margin: 0 }}>
            For the moments that come up in every game.
          </p>
          {MOMENTS.map((m) => (
            <details key={m.id} className="coach-item">
              <summary>{m.title}</summary>
              <div className="say-this">
                {m.say.map((s) => (
                  <div key={s}>
                    <span className="say-label">Say</span> “{s}”
                  </div>
                ))}
                {m.not.map((s) => (
                  <div key={s} className="say-not">
                    <span className="say-label">Not</span> “{s}”
                  </div>
                ))}
                <div className="small muted">{m.why}</div>
              </div>
            </details>
          ))}
        </section>

        <section className="card" aria-labelledby="guides">
          <h2 id="guides">For the night before</h2>
          {GUIDES.map((g) => (
            <details key={g.id} className="coach-item">
              <summary>{g.title}</summary>
              <p className="small">{g.intro}</p>
              {g.sections.map((s) => (
                <div key={s.h}>
                  <strong className="small">{s.h}</strong>
                  <ul className="huddle-points">
                    {s.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </details>
          ))}
        </section>
      </main>
    </>
  )
}
