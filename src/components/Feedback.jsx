import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { FEEDBACK_EMAIL } from '../config.js'
import { feedbackAvailable, feedbackMessage, mailtoLink } from '../lib/feedback.js'

// Shows exactly what will be sent. AttaCoach sends nothing itself: "Open my email app" hands the
// message to the coach's own email app, and they press send there.
export function FeedbackSheet({ team, plan = null, rating = null, onClose, to = FEEDBACK_EMAIL }) {
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const [choice, setChoice] = useState(rating)
  const msg = feedbackMessage({ team, plan, rating: choice, note })
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${msg.subject}\n\n${msg.body}`)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <Sheet title={plan ? 'Plan feedback' : 'Send feedback'} onClose={onClose}>
      {plan && (
        <div className="stack">
          <strong className="small">Was this plan right?</strong>
          <div className="seg" role="group" aria-label="Was this plan right?">
            <button type="button" aria-pressed={choice === 'up'} onClick={() => setChoice(choice === 'up' ? null : 'up')}>
              Yes
            </button>
            <button type="button" aria-pressed={choice === 'down'} onClick={() => setChoice(choice === 'down' ? null : 'down')}>
              Not quite
            </button>
          </div>
        </div>
      )}
      <label className="field">
        {plan ? 'Anything to add? (optional)' : 'What worked, and what did not?'}
        <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Please leave out names." />
      </label>
      <div className="stack">
        <strong className="small">This is exactly what will be sent to {to}:</strong>
        <pre className="feedback-preview" aria-label="Message to be sent">
          {msg.body}
        </pre>
        <span className="small muted">Your email app opens with this message. Nothing is sent until you press send there.</span>
      </div>
      <div className="action-row">
        <a className="btn" href={mailtoLink(to, msg)}>
          Open my email app
        </a>
        <button type="button" className="btn quiet" onClick={copy}>
          {copied ? 'Copied' : 'Copy the message'}
        </button>
      </div>
    </Sheet>
  )
}

// Settings: a general "Send feedback" card. Hidden when there is nowhere to send it.
export function SettingsFeedback({ team, to = FEEDBACK_EMAIL }) {
  const [open, setOpen] = useState(false)
  if (!feedbackAvailable(to)) return null
  return (
    <section className="card">
      <h2 className="sm-h">Send feedback</h2>
      <p className="small muted">Tell us what worked and what didn't. You will see the whole message before anything is sent.</p>
      <button className="btn quiet" onClick={() => setOpen(true)}>
        Send feedback
      </button>
      {open && <FeedbackSheet team={team} to={to} onClose={() => setOpen(false)} />}
    </section>
  )
}

// "Was this plan right?" on the plan page and the timer's finish screen.
export function PlanFeedback({ team, plan, variant = 'page', to = FEEDBACK_EMAIL }) {
  const [rating, setRating] = useState(undefined)
  if (!feedbackAvailable(to)) return null
  const cls = variant === 'run' ? 'run-btn' : 'btn quiet'
  return (
    <div className={`plan-feedback no-print${variant === 'run' ? ' on-run' : ''}`} role="group" aria-label="Was this plan right?">
      <strong>Was this plan right?</strong>
      <button type="button" className={cls} aria-label="Yes, this plan was right" onClick={() => setRating('up')}>
        <span aria-hidden="true">👍</span> Yes
      </button>
      <button type="button" className={cls} aria-label="No, this plan was not right" onClick={() => setRating('down')}>
        <span aria-hidden="true">👎</span> Not quite
      </button>
      {rating !== undefined && <FeedbackSheet team={team} plan={plan} rating={rating} to={to} onClose={() => setRating(undefined)} />}
    </div>
  )
}
