import { vi } from 'vitest'

// A stand-in for the Supabase client so tests never touch the network.
export const SESSION = {
  access_token: 'test-access',
  refresh_token: 'test-refresh',
  expires_at: 1, // long expired: the app must still open from the cached sign-in
  user: { id: 'user-1', email: 'coach@example.com' },
}

export const fake = {
  auth: {
    signInWithOtp: vi.fn(),
    verifyOtp: vi.fn(),
    onAuthStateChange: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
    signOut: vi.fn(),
  },
  rpc: vi.fn(),
  emit: () => {},
}

export function resetFake() {
  let listener = null
  fake.emit = (event, session) => listener?.(event, session)
  fake.auth.signInWithOtp.mockReset().mockResolvedValue({ data: {}, error: null })
  fake.auth.verifyOtp.mockReset().mockResolvedValue({ data: {}, error: null })
  fake.auth.onAuthStateChange.mockReset().mockImplementation((cb) => {
    listener = cb
    return { data: { subscription: { unsubscribe: () => (listener = null) } } }
  })
  // Like the real client: there is a session only when one is stored on the device.
  const stored = () => window.localStorage.getItem('attacoach-auth') !== null
  fake.auth.getSession.mockReset().mockImplementation(async () => ({ data: { session: stored() ? SESSION : null } }))
  fake.auth.getUser.mockReset().mockImplementation(async () =>
    stored() ? { data: { user: SESSION.user }, error: null } : { data: { user: null }, error: { status: 400, message: 'Auth session missing!' } },
  )
  fake.auth.signOut.mockReset().mockResolvedValue({ error: null })
  fake.rpc.mockReset().mockResolvedValue({ data: null, error: null })
}

export function seedSession(session = SESSION) {
  window.localStorage.setItem('attacoach-auth', JSON.stringify(session))
}

export function setOnline(online) {
  Object.defineProperty(window.navigator, 'onLine', { value: online, configurable: true })
}
