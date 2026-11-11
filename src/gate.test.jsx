import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { db, saveTeam, clearEverything } from './lib/db.js'
import { defaultRules } from './data/constants.js'
import { fake, resetFake, seedSession, setOnline, SESSION } from './test/fakeSupabase.js'
import { DONATE_URL, APP_URL } from './config.js'
import { friendlyAuthError, isValidEmail } from './lib/auth.js'

vi.mock('./config.js', async (orig) => ({ ...(await orig()), AUTH_REQUIRED: true }))

vi.mock('./lib/supabase.js', async () => {
  const { fake } = await import('./test/fakeSupabase.js')
  return { getClient: () => fake, AUTH_STORAGE_KEY: 'attacoach-auth' }
})

const press = (name) => screen.getByRole('button', { name })
const cached = () => window.localStorage.getItem('attacoach-auth')

beforeEach(async () => {
  await clearEverything()
  window.location.hash = ''
  window.localStorage.clear()
  resetFake()
  setOnline(true)
  vi.restoreAllMocks()
})

describe('sign-in gate', () => {
  it('shows only the sign-in screen when nobody is signed in', async () => {
    render(<App />)
    expect(await screen.findByText('Sign in or create your account')).toBeTruthy()
    expect(screen.queryByText('Set up your team')).toBeNull()
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('rejects a bad email without calling the server', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText('Email'), 'not-an-email')
    await user.click(press('Email me a sign-in link'))
    expect((await screen.findByRole('alert')).textContent).toMatch(/doesn't look right/)
    expect(fake.auth.signInWithOtp).not.toHaveBeenCalled()
  })

  it('sends the link and a code, creating the account if needed', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText('Email'), '  Coach@Example.COM ')
    await user.click(press('Email me a sign-in link'))
    expect(await screen.findByText('Check your email')).toBeTruthy()
    const arg = fake.auth.signInWithOtp.mock.calls[0][0]
    expect(arg.email).toBe('coach@example.com')
    expect(arg.options.shouldCreateUser).toBe(true)
    expect(arg.options.emailRedirectTo.endsWith('/')).toBe(true)
    expect(screen.getByText('coach@example.com')).toBeTruthy()
    expect(press(/Send again in/).disabled).toBe(true)
  })

  it('signs in with the code and opens the app', async () => {
    const user = userEvent.setup()
    fake.auth.getSession.mockResolvedValue({ data: { session: null } })
    render(<App />)
    await user.type(await screen.findByLabelText('Email'), 'coach@example.com')
    await user.click(press('Email me a sign-in link'))
    await user.type(await screen.findByLabelText('Code from the email'), '123456')
    await user.click(press('Sign in with code'))
    expect(fake.auth.verifyOtp).toHaveBeenCalledWith({ email: 'coach@example.com', token: '123456', type: 'email' })
    act(() => fake.emit('SIGNED_IN', SESSION))
    expect(await screen.findByText('Set up your team')).toBeTruthy()
  })

  it('explains a wrong or expired code', async () => {
    const user = userEvent.setup()
    fake.auth.verifyOtp.mockResolvedValue({ data: {}, error: { code: 'otp_expired', message: 'Token has expired or is invalid', status: 403 } })
    render(<App />)
    await user.type(await screen.findByLabelText('Email'), 'coach@example.com')
    await user.click(press('Email me a sign-in link'))
    await user.type(await screen.findByLabelText('Code from the email'), '000000')
    await user.click(press('Sign in with code'))
    expect((await screen.findByRole('alert')).textContent).toMatch(/wrong or has expired/)
  })

  it('keeps the code button off until the code looks complete', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText('Email'), 'coach@example.com')
    await user.click(press('Email me a sign-in link'))
    const code = await screen.findByLabelText('Code from the email')
    expect(press('Sign in with code').disabled).toBe(true)
    await user.type(code, 'ab12')
    expect(code.value).toBe('12')
    await user.type(code, '3456')
    expect(press('Sign in with code').disabled).toBe(false)
  })

  it('lets the coach go back and use a different email', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText('Email'), 'coach@example.com')
    await user.click(press('Email me a sign-in link'))
    await user.click(await screen.findByRole('button', { name: 'Use a different email' }))
    expect(await screen.findByLabelText('Email')).toBeTruthy()
  })

  it.each([
    [{ code: 'over_email_send_rate_limit', status: 429, message: 'rate limit' }, /Too many sign-in emails/],
    [{ message: 'Email address not authorized.', status: 400 }, /Sign-ups aren't open to that address yet/],
    [{ code: 'email_address_invalid', message: 'Email address is invalid', status: 400 }, /doesn't look right/],
    [{ name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 }, /Couldn't reach the sign-in service/],
  ])('shows a plain message for %j', async (error, pattern) => {
    const user = userEvent.setup()
    fake.auth.signInWithOtp.mockResolvedValue({ data: {}, error })
    render(<App />)
    await user.type(await screen.findByLabelText('Email'), 'coach@example.com')
    await user.click(press('Email me a sign-in link'))
    expect((await screen.findByRole('alert')).textContent).toMatch(pattern)
  })

  it('says so when offline and disables sending', async () => {
    setOnline(false)
    render(<App />)
    expect(await screen.findByText(/You're offline/)).toBeTruthy()
    const input = screen.getByLabelText('Email')
    await userEvent.setup().type(input, 'coach@example.com')
    expect(press('Email me a sign-in link').disabled).toBe(true)
  })
})

describe('staying signed in', () => {
  it('opens offline from a cached sign-in even when the token has expired', async () => {
    seedSession()
    setOnline(false)
    fake.auth.getSession.mockResolvedValue({ data: { session: null } }) // refresh failed: no signal
    render(<App />)
    expect(await screen.findByText('Set up your team')).toBeTruthy()
    await waitFor(() => expect(fake.auth.getSession).toHaveBeenCalled())
    expect(screen.queryByText('Sign in or create your account')).toBeNull()
    expect(fake.auth.getUser).not.toHaveBeenCalled()
    expect(cached()).not.toBeNull()
  })

  it('stays in when the server cannot be reached', async () => {
    seedSession()
    fake.auth.getUser.mockResolvedValue({ data: { user: null }, error: { name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' } })
    render(<App />)
    await screen.findByText('Set up your team')
    await waitFor(() => expect(fake.auth.getUser).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 30))
    expect(screen.queryByText('Sign in or create your account')).toBeNull()
  })

  it('shows the gate again when the server says the sign-in is not valid', async () => {
    seedSession()
    fake.auth.getUser.mockResolvedValue({ data: { user: null }, error: { status: 401, message: 'invalid JWT' } })
    render(<App />)
    expect(await screen.findByText('Sign in or create your account')).toBeTruthy()
    expect(cached()).toBeNull()
  })

  it('returns to the gate when the session ends elsewhere', async () => {
    seedSession()
    render(<App />)
    await screen.findByText('Set up your team')
    act(() => fake.emit('SIGNED_OUT', null))
    expect(await screen.findByText('Sign in or create your account')).toBeTruthy()
  })

  it('ignores a malformed cached session', async () => {
    window.localStorage.setItem('attacoach-auth', '{nope')
    fake.auth.getSession.mockResolvedValue({ data: { session: null } })
    render(<App />)
    expect(await screen.findByText('Sign in or create your account')).toBeTruthy()
  })
})

describe('settings page: account, share and donate', () => {
  beforeEach(async () => {
    seedSession()
    await saveTeam({ name: 'Hawks', division: '10U', experience: 'some', needs: ['contact'], rules: defaultRules('10U') })
    window.location.hash = '#/settings'
  })

  it('shows who is signed in', async () => {
    render(<App />)
    expect(await screen.findByText('coach@example.com')).toBeTruthy()
  })

  it('signs out but keeps teams and plans on the device', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(await screen.findByText('Sign in or create your account')).toBeTruthy()
    expect(cached()).toBeNull()
    expect(await db.teams.count()).toBe(1)
  })

  it('signs out even with no signal', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fake.auth.signOut.mockRejectedValue(new Error('Failed to fetch'))
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(await screen.findByText('Sign in or create your account')).toBeTruthy()
    expect(cached()).toBeNull()
  })

  it('does nothing when sign out is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(screen.queryByText('Sign in or create your account')).toBeNull()
    expect(cached()).not.toBeNull()
  })

  it('deletes the account through the server function, then signs out', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Delete account' }))
    expect(await screen.findByText('Sign in or create your account')).toBeTruthy()
    expect(fake.rpc).toHaveBeenCalledWith('delete_my_account')
    expect(cached()).toBeNull()
    expect(await db.teams.count()).toBe(1)
  })

  it('keeps the account when the server refuses', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fake.rpc.mockResolvedValue({ data: null, error: { message: 'function not found', status: 404 } })
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Delete account' }))
    expect((await screen.findByRole('status')).textContent).toMatch(/Couldn't delete your account/)
    expect(cached()).not.toBeNull()
  })

  it('asks for a connection before deleting the account', async () => {
    setOnline(false)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Delete account' }))
    expect((await screen.findByRole('status')).textContent).toMatch(/Connect to the internet/)
    expect(confirm).not.toHaveBeenCalled()
    expect(fake.rpc).not.toHaveBeenCalled()
  })

  it('shares the app link with the Web Share sheet', async () => {
    const share = vi.fn().mockResolvedValue()
    Object.defineProperty(window.navigator, 'share', { value: share, configurable: true })
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Share AttaCoach' }))
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: APP_URL, title: 'AttaCoach' }))
    delete window.navigator.share
  })

  it('copies the link when sharing is not available', async () => {
    delete window.navigator.share
    const user = userEvent.setup()
    const writeText = vi.spyOn(window.navigator.clipboard, 'writeText').mockResolvedValue()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Share AttaCoach' }))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(APP_URL))
    expect((await screen.findByRole('status')).textContent).toMatch(/Link copied/)
  })

  it('links to PayPal in a new tab', async () => {
    render(<App />)
    const link = await screen.findByRole('link', { name: 'Donate with PayPal' })
    expect(link.getAttribute('href')).toBe('https://paypal.me/chriskosho')
    expect(DONATE_URL).toBe('https://paypal.me/chriskosho')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('tells people their email is used to sign in', async () => {
    render(<App />)
    const card = (await screen.findByText(/You sign in with your email/)).closest('section')
    expect(card.textContent).toMatch(/Nothing about them is sent to a server/)
  })
})

describe('helpers', () => {
  it('validates emails', () => {
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail('a@b')).toBe(false)
    expect(isValidEmail('a b@c.com')).toBe(false)
  })

  it('maps unknown errors to a safe message', () => {
    expect(friendlyAuthError({ message: 'boom' }, 'send')).toMatch(/Something went wrong/)
    expect(friendlyAuthError({ message: 'boom' }, 'verify')).toMatch(/wrong or has expired/)
  })

  it('reads an expired-link error from the address bar and clears it', async () => {
    window.location.hash = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    vi.resetModules()
    const mod = await import('./lib/auth.js')
    expect(mod.urlAuthProblem).toBe('expired')
    expect(window.location.hash).toBe('')
  })

  it('leaves normal app routes alone', async () => {
    window.location.hash = '#/plans'
    vi.resetModules()
    const mod = await import('./lib/auth.js')
    expect(mod.urlAuthProblem).toBeNull()
    expect(window.location.hash).toBe('#/plans')
  })
})
