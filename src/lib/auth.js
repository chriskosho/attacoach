import { useEffect, useState } from 'react'
import { getClient, AUTH_STORAGE_KEY } from './supabase.js'

// ---------------------------------------------------------------- Sign-in link in the URL

// Read once at load, before the Supabase client sees the URL.
function readUrlAuthProblem() {
  try {
    const hash = window.location.hash.replace(/^#\/?/, '')
    if (!/(^|&)error(_code|_description)?=/.test(hash)) return null
    const p = new URLSearchParams(hash)
    const code = p.get('error_code') || ''
    // Remove the error from the address bar so a refresh doesn't show it again.
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    return code === 'otp_expired' ? 'expired' : 'failed'
  } catch {
    return null
  }
}

export const urlAuthProblem = readUrlAuthProblem()

const returningFromLink = (() => {
  try {
    return /(^|[#&/])access_token=/.test(window.location.hash)
  } catch {
    return false
  }
})()

// ---------------------------------------------------------------- Cached session

// The sign-in is kept on the device. A stored session counts as signed in even when the
// access token has expired and there is no signal to refresh it, so the app opens at the field.
export function readCachedSession() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    if (s && s.refresh_token && s.user?.email) return { email: s.user.email, id: s.user.id }
  } catch {
    /* storage unavailable or unreadable */
  }
  return null
}

function clearCachedSession() {
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------- Hook

const bus = new EventTarget()

export function useAuth() {
  const [state, setState] = useState(() => {
    const cached = readCachedSession()
    if (cached) return { status: 'signedIn', email: cached.email, id: cached.id }
    return { status: returningFromLink ? 'loading' : 'signedOut' }
  })

  useEffect(() => {
    let alive = true
    const signedOut = () => alive && setState({ status: 'signedOut' })
    const signedIn = (user) => alive && setState({ status: 'signedIn', email: user.email, id: user.id })

    const onBus = () => signedOut()
    bus.addEventListener('signedout', onBus)

    const auth = getClient().auth
    const { data } = auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearCachedSession()
        signedOut()
      } else if (session?.user) signedIn(session.user)
    })

    auth.getSession().then(({ data: { session } }) => {
      if (!alive) return
      if (session?.user) signedIn(session.user)
      else if (!readCachedSession()) signedOut()
    })

    // When online, ask the server whether this sign-in is still good. A revoked or made-up
    // session is dropped. Being offline, or a server hiccup, never signs anyone out.
    if (typeof navigator === 'undefined' || navigator.onLine) {
      auth
        .getUser()
        .then(({ error }) => {
          if (error && error.status >= 400 && error.status < 500 && error.status !== 429) {
            clearCachedSession()
            auth.signOut({ scope: 'local' }).catch(() => {})
            signedOut()
          }
        })
        .catch(() => {})
    }

    return () => {
      alive = false
      bus.removeEventListener('signedout', onBus)
      data?.subscription?.unsubscribe()
    }
  }, [])

  return state
}

// ---------------------------------------------------------------- Actions

export const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

export const cleanEmail = (s) => s.trim().toLowerCase()

export function redirectUrl() {
  return window.location.origin + import.meta.env.BASE_URL
}

export async function sendSignInEmail(email) {
  const { error } = await getClient().auth.signInWithOtp({
    email: cleanEmail(email),
    options: { shouldCreateUser: true, emailRedirectTo: redirectUrl() },
  })
  if (error) throw error
}

export async function verifyCode(email, code) {
  const { error } = await getClient().auth.verifyOtp({ email: cleanEmail(email), token: code.trim(), type: 'email' })
  if (error) throw error
}

// Signs out on this device. Teams and plans stay on the device. Works offline.
export async function signOut() {
  try {
    await getClient().auth.signOut({ scope: 'local' })
  } catch {
    /* offline: clear the device copy below */
  }
  clearCachedSession()
  bus.dispatchEvent(new Event('signedout'))
}

export async function deleteAccount() {
  const { error } = await getClient().rpc('delete_my_account')
  if (error) throw error
  await signOut()
}

// Plain-language messages for the things that go wrong.
export function friendlyAuthError(error, context = 'send') {
  const code = error?.code || ''
  const msg = String(error?.message || '')
  if (typeof navigator !== 'undefined' && !navigator.onLine) return "You're offline. Connect to the internet to continue."
  if (error?.name === 'AuthRetryableFetchError' || /failed to fetch|network/i.test(msg)) {
    return "Couldn't reach the sign-in service. Check your connection and try again."
  }
  if (code === 'over_email_send_rate_limit' || error?.status === 429) {
    return 'Too many sign-in emails were requested. Wait a minute and try again.'
  }
  if (code === 'email_address_invalid' || /invalid.*email|email.*invalid/i.test(msg)) {
    return "That email address doesn't look right. Check it and try again."
  }
  if (/not authorized/i.test(msg)) {
    return "Sign-ups aren't open to that address yet. Try again later."
  }
  if (context === 'verify') return 'That code is wrong or has expired. Check it, or send a new one.'
  if (context === 'delete') return "Couldn't delete your account. Try again in a moment."
  return 'Something went wrong sending your sign-in email. Try again in a moment.'
}
