import { useEffect, useState } from 'react'
import { sendSignInEmail, verifyCode, friendlyAuthError, isValidEmail, cleanEmail, urlAuthProblem } from '../lib/auth.js'

const COOLDOWN_SECONDS = 60

export function Splash() {
  return (
    <div className="app">
      <main className="page gate-page" aria-busy="true">
        <div className="hero-welcome">
          <h1>
            Atta<span>Coach</span>
          </h1>
          <p>Signing you in…</p>
        </div>
      </main>
    </div>
  )
}

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [stage, setStage] = useState('email') // 'email' | 'sent'
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [wait, setWait] = useState(0)
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const [linkProblem, setLinkProblem] = useState(urlAuthProblem)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const send = async (e) => {
    e?.preventDefault()
    setError(null)
    if (!isValidEmail(cleanEmail(email))) {
      setError("That email address doesn't look right. Check it and try again.")
      return
    }
    setBusy(true)
    try {
      await sendSignInEmail(email)
      setLinkProblem(null)
      setStage('sent')
      setCode('')
      setWait(COOLDOWN_SECONDS)
    } catch (err) {
      setError(friendlyAuthError(err, 'send'))
    } finally {
      setBusy(false)
    }
  }

  const verify = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await verifyCode(email, code)
      // The sign-in listener swaps this screen out.
    } catch (err) {
      setError(friendlyAuthError(err, 'verify'))
      setBusy(false)
    }
  }

  const codeOk = /^\d{6,10}$/.test(code.trim())

  return (
    <div className="app">
      <main className="page gate-page">
        <div className="hero-welcome">
          <h1>
            Atta<span>Coach</span>
          </h1>
          <p>Practice plans built around what your team needs to work on.</p>
        </div>

        {linkProblem && (
          <p className="note" role="alert">
            That sign-in link has {linkProblem === 'expired' ? 'expired or was already used' : "a problem"}. Enter your email to get a new one.
          </p>
        )}
        {!online && (
          <p className="note" role="status">
            You're offline. Connect to the internet to sign in the first time. After that, AttaCoach works without a signal.
          </p>
        )}

        {stage === 'email' ? (
          <form className="card" onSubmit={send} noValidate>
            <h2>Sign in or create your account</h2>
            <p className="muted small">New here? Enter your email and we'll create your free account. There's no password to remember.</p>
            <label className="field">
              Email
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="coach@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby={error ? 'gate-error' : undefined}
                aria-invalid={error ? true : undefined}
                autoFocus
              />
            </label>
            {error && (
              <p className="note" id="gate-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn big" type="submit" disabled={busy || !online || !email.trim()}>
              {busy ? 'Sending…' : 'Email me a sign-in link'}
            </button>
            <p className="muted small">Your email is used to sign you in. Your teams and plans stay on this device.</p>
          </form>
        ) : (
          <form className="card" onSubmit={verify}>
            <h2>Check your email</h2>
            <p>
              We sent a sign-in link and a code to <strong>{cleanEmail(email)}</strong>. Open the link on this device, or enter the code here.
            </p>
            <label className="field">
              Code from the email
              <input
                type="text"
                className="code-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                aria-describedby={error ? 'gate-error' : undefined}
                aria-invalid={error ? true : undefined}
                autoFocus
              />
            </label>
            {error && (
              <p className="note" id="gate-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn big" type="submit" disabled={busy || !online || !codeOk}>
              {busy ? 'Checking…' : 'Sign in with code'}
            </button>
            <div className="row wrap">
              <button type="button" className="btn quiet small" disabled={busy || wait > 0 || !online} onClick={send}>
                {wait > 0 ? `Send again in ${wait}s` : 'Send a new link'}
              </button>
              <button
                type="button"
                className="btn quiet small"
                onClick={() => {
                  setStage('email')
                  setError(null)
                }}
              >
                Use a different email
              </button>
            </div>
            <p className="muted small">Can't find it? Check your spam folder. Links stop working after a short while.</p>
          </form>
        )}
      </main>
    </div>
  )
}
