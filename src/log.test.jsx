import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { db, saveTeam, clearEverything, saveDebrief, exportBackup, importBackup, deleteTeam } from './lib/db.js'
import { defaultRules } from './data/constants.js'
import { suggestFocus, resultText, sortEntries, weakAreas } from './lib/debrief.js'

const team = { name: 'Blue Jays', division: '12U', experience: 'some', needs: ['baserunning', 'grounders', 'awareness'], rules: defaultRules('12U') }
const entry = (over = {}) => ({ kind: 'game', date: '2026-11-07', ratings: {}, next: [], ...over })

describe('suggestFocus', () => {
  it('returns null with nothing logged or nothing pointing anywhere', () => {
    expect(suggestFocus(team, [])).toBeNull()
    expect(suggestFocus(team, [entry({ ratings: { hitting: 3 } })])).toBeNull()
  })

  it('turns a needs-work area into its needs', () => {
    const s = suggestFocus(team, [entry({ ratings: { hitting: 1 } })])
    expect(s.needs).toEqual(expect.arrayContaining(['contact', 'approach', 'bunting']))
    expect(s.reasons.contact).toMatchObject({ kind: 'game', date: '2026-11-07' })
  })

  it('ranks what the coach picked for next above a weak area, and ties favor team needs', () => {
    const s = suggestFocus(team, [entry({ ratings: { fielding: 1 }, next: ['pitching'] })])
    expect(s.needs[0]).toBe('pitching')
    expect(s.needs[1]).toBe('grounders') // team need breaks the tie among fielding needs
  })

  it('counts newer entries more than older ones', () => {
    const old = entry({ date: '2026-10-01', createdAt: 'a', ratings: { throwing: 1 } })
    const fresh = entry({ date: '2026-11-07', createdAt: 'b', ratings: { baserunning: 1 } })
    const s = suggestFocus({ needs: [] }, [old, fresh])
    expect(s.needs).toEqual(['baserunning', 'throwing'])
  })

  it('lets a strong rating cancel an older weak one', () => {
    const old = entry({ date: '2026-10-01', ratings: { throwing: 1 } })
    const fresh = entry({ date: '2026-11-07', ratings: { throwing: 3 } })
    expect(suggestFocus({ needs: [] }, [old, fresh])).toBeNull()
  })

  it('skips needs the division cannot use and caps at three', () => {
    const e = entry({ ratings: { hitting: 1, fielding: 1, throwing: 1 } })
    const s = suggestFocus(team, [e], ['contact', 'throwing', 'grounders', 'catching'])
    expect(s.needs).toHaveLength(3)
    expect(s.needs).not.toContain('bunting')
  })
})

describe('helpers', () => {
  it('writes results', () => {
    expect(resultText({ ourScore: 7, theirScore: 4 })).toBe('W 7-4')
    expect(resultText({ ourScore: 2, theirScore: 5 })).toBe('L 2-5')
    expect(resultText({ ourScore: 3, theirScore: 3 })).toBe('T 3-3')
    expect(resultText({ ourScore: 3, theirScore: null })).toBeNull()
    expect(resultText({ ourScore: 0, theirScore: 0 })).toBe('T 0-0')
  })
  it('sorts newest first and lists weak areas', () => {
    expect(sortEntries([{ date: '2026-01-01' }, { date: '2026-03-01' }]).map((e) => e.date)).toEqual(['2026-03-01', '2026-01-01'])
    expect(weakAreas({ ratings: { hitting: 1, fielding: 2, throwing: 1 } })).toEqual(['hitting', 'throwing'])
  })
})

describe('log storage', () => {
  beforeEach(clearEverything)

  it('backs up, restores and deletes with the team', async () => {
    const t = await saveTeam(team)
    await saveDebrief(entry({ teamId: t.id, ratings: { hitting: 1 } }))
    const backup = await exportBackup()
    expect(backup.debriefs).toHaveLength(1)
    await clearEverything()
    expect(await db.debriefs.count()).toBe(0)
    const r = await importBackup(backup)
    expect(r.debriefs).toBe(1)
    await deleteTeam(t.id)
    expect(await db.debriefs.count()).toBe(0)
  })

  it('still restores an older backup with no log', async () => {
    const t = { ...team, id: 't1' }
    const r = await importBackup({ format: 'attacoach-backup', version: 1, teams: [t], plans: [] })
    expect(r).toMatchObject({ teams: 1, plans: 0, debriefs: 0 })
  })
})

describe('Log tab', () => {
  beforeEach(async () => {
    await clearEverything()
    window.location.hash = ''
  })

  it('records a game, shows it, and suggests it on the Today tab', async () => {
    const t = await saveTeam(team)
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Log' }))
    expect(await screen.findByText('Nothing logged yet')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Game debrief' }))

    await user.type(await screen.findByLabelText('Opponent'), 'Tigers')
    await user.type(screen.getByLabelText('Our runs'), '4')
    await user.type(screen.getByLabelText('Their runs'), '9')
    const hitting = screen.getByRole('group', { name: 'Hitting' })
    await user.click(within(hitting).getByRole('button', { name: 'Needs work' }))
    await user.type(screen.getByLabelText('What we saw'), 'Chased high pitches')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(/vs Tigers, L 4-9/)).toBeTruthy()
    expect(screen.getByText('Needs work: Hitting')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Work on next' })).toBeTruthy()
    expect(await db.debriefs.where('teamId').equals(t.id).count()).toBe(1)

    await user.click(screen.getByRole('button', { name: 'Plan next practice' }))
    const banner = await screen.findByRole('region', { name: 'Suggested focus' })
    expect(within(banner).getByText('Making contact')).toBeTruthy()
    await user.click(within(banner).getByRole('button', { name: 'Use this focus' }))
    expect(await within(banner).findByText("Today's focus matches.")).toBeTruthy()
  })

  it('clears a rating on a second tap, edits and deletes an entry', async () => {
    const t = await saveTeam(team)
    const saved = await saveDebrief(entry({ teamId: t.id, opponent: 'Hawks', ratings: { fielding: 1 } }))
    const user = userEvent.setup()
    window.location.hash = `#/debrief/${saved.id}`
    render(<App />)
    const fielding = await screen.findByRole('group', { name: 'Fielding' })
    const btn = within(fielding).getByRole('button', { name: 'Needs work' })
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    await user.click(btn)
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByText(/vs Hawks/)
    expect((await db.debriefs.get(saved.id)).ratings).toEqual({})

    window.confirm = () => true
    await user.click(screen.getByText(/vs Hawks/))
    await user.click(await screen.findByRole('button', { name: 'Delete this entry' }))
    await waitFor(async () => expect(await db.debriefs.count()).toBe(0))
  })

  it('links a practice recap to a plan', async () => {
    const t = await saveTeam(team)
    await db.plans.put({ id: 'p1', teamId: t.id, date: '2026-11-05', createdAt: '2026-11-05T10:00:00Z', focus: ['catching'], blocks: [] })
    const user = userEvent.setup()
    window.location.hash = '#/debrief/practice'
    render(<App />)
    expect((await screen.findByLabelText('Which practice')).value).toBe('p1')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await db.debriefs.toArray())[0]).toMatchObject({ kind: 'practice', planId: 'p1' }))
  })
})
