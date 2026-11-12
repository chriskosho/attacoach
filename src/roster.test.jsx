import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { db, saveTeam, savePlayers, clearEverything, deleteTeam, exportBackup, importBackup } from './lib/db.js'
import { defaultRules, starterNeeds } from './data/constants.js'
import { rollupNeeds, canPitch, playerName, blankPlayer } from './lib/roster.js'
import { buildPlan } from './lib/plan.js'

const P = (over) => ({ ...blankPlayer(), first: 'A', ...over })

describe('rollupNeeds', () => {
  it('ranks needs by how many players are weak at them', () => {
    const players = [
      P({ weaknesses: ['flyballs', 'throwing'] }),
      P({ weaknesses: ['flyballs'] }),
      P({ weaknesses: ['flyballs', 'bunting'] }),
      P({ weaknesses: ['throwing'] }),
    ]
    expect(rollupNeeds(players)).toEqual(['flyballs', 'throwing', 'bunting'])
  })

  it('counts a novice weakness more than a strong player\'s, and strengths pull a need down', () => {
    expect(rollupNeeds([P({ rating: 'novice', weaknesses: ['catching'] }), P({ rating: 'strong', weaknesses: ['throwing'] })])).toEqual(['catching', 'throwing'])
    expect(rollupNeeds([P({ weaknesses: ['catching'] }), P({ strengths: ['catching'] }), P({ strengths: ['catching'] })])).toEqual([])
  })

  it('leaves out needs the division cannot use, caps the count, and handles nothing', () => {
    expect(rollupNeeds([P({ weaknesses: ['pitching', 'catching'] })], ['catching'])).toEqual(['catching'])
    expect(rollupNeeds([P({ weaknesses: ['catching', 'throwing', 'grounders', 'contact'] })], null, 2)).toHaveLength(2)
    expect(rollupNeeds([])).toEqual([])
  })

  it('knows who can pitch and how to write a name', () => {
    expect(canPitch(P({ positions: ['SS', 'P'] }))).toBe(true)
    expect(canPitch(P({ positions: ['SS'] }))).toBe(false)
    expect(playerName({ first: 'Sam', last: '' })).toBe('Sam')
    expect(playerName({ first: 'Sam', last: 'Lee' })).toBe('Sam Lee')
  })
})

describe('starter plan', () => {
  it('uses the basics when a team has not chosen skills', () => {
    const t = { id: 't', division: '6U', experience: 'new', needs: [], rules: defaultRules('6U') }
    expect(buildPlan(t, { minutes: 45, coaches: 1, seed: 1 }).focus).toEqual(starterNeeds('6U'))
    expect(buildPlan({ ...t, division: '12U' }, { minutes: 60, coaches: 1, seed: 1 }).focus).toEqual(starterNeeds('12U'))
  })
})

describe('roster storage', () => {
  beforeEach(clearEverything)
  const team = { name: 'Hawks', division: '10U', experience: 'some', needs: [], rules: defaultRules('10U') }

  it('replaces a roster exactly, removing players who are gone', async () => {
    const t = await saveTeam(team)
    const a = P({ first: 'Ann' })
    const b = P({ first: 'Bo' })
    await savePlayers(t.id, [a, b])
    expect(await db.players.count()).toBe(2)
    await savePlayers(t.id, [{ ...a, rating: 'solid' }])
    const rows = await db.players.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ first: 'Ann', rating: 'solid', teamId: t.id })
  })

  it('keeps rosters separate per team, and removes them with the team', async () => {
    const t1 = await saveTeam(team)
    const t2 = await saveTeam({ ...team, name: 'Owls' })
    await savePlayers(t1.id, [P({ first: 'Ann' })])
    await savePlayers(t2.id, [P({ first: 'Bo' })])
    await deleteTeam(t1.id)
    expect((await db.players.toArray()).map((p) => p.first)).toEqual(['Bo'])
  })

  it('goes into backups, and old backups without players still restore', async () => {
    const t = await saveTeam(team)
    await savePlayers(t.id, [P({ first: 'Ann' })])
    const data = await exportBackup()
    expect(data.players).toHaveLength(1)
    await clearEverything()
    expect((await importBackup(JSON.parse(JSON.stringify(data)))).players).toBe(1)
    await clearEverything()
    expect((await importBackup({ format: 'attacoach-backup', teams: [{ ...team, id: 'x' }], plans: [] })).players).toBe(0)
  })
})

describe('roster on the Team tab', () => {
  beforeEach(async () => {
    await clearEverything()
    window.location.hash = '#/team'
  })
  const team = { name: 'Hawks', division: '10U', experience: 'some', needs: ['contact'], rules: defaultRules('10U') }

  it('adds, edits and removes players, and offers to update team needs', async () => {
    const t = await saveTeam(team)
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Add a player' }))
    await user.type(within(screen.getByRole('dialog')).getByLabelText('First name'), 'Sam')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save without details' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Done' }))
    await waitFor(async () => expect(await db.players.count()).toBe(1))

    await user.click(await screen.findByRole('button', { name: 'Edit Sam' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(within(dialog).getByRole('group', { name: 'Needs work' })).getByRole('button', { name: 'Throwing accuracy' }))
    // A skill is a strength or a weakness, not both: it is greyed out in the other list.
    const strengthChip = () => within(within(dialog).getByRole('group', { name: 'Strengths' })).getByRole('button', { name: 'Throwing accuracy' })
    const needsChip = () => within(within(dialog).getByRole('group', { name: 'Needs work' })).getByRole('button', { name: 'Throwing accuracy' })
    expect(strengthChip().disabled).toBe(true)
    expect(needsChip().getAttribute('aria-pressed')).toBe('true')
    // Taking it off needs work frees it up as a strength, and then needs work is greyed out.
    await user.click(needsChip())
    expect(strengthChip().disabled).toBe(false)
    await user.click(strengthChip())
    expect(needsChip().disabled).toBe(true)
    await user.click(strengthChip())
    await user.click(needsChip())
    await user.click(within(dialog).getByRole('button', { name: 'Save player' }))
    await waitFor(async () => expect((await db.players.toArray())[0].weaknesses).toEqual(['throwing']))

    await user.click(await screen.findByRole('button', { name: 'Update team needs' }))
    await waitFor(async () => expect((await db.teams.get(t.id)).needs).toEqual(['throwing', 'contact']))

    await user.click(screen.getByRole('button', { name: 'Edit Sam' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }))
    await waitFor(async () => expect(await db.players.count()).toBe(0))
  })

  it('adds several players in a row from one popup, keeping each one\'s skills', async () => {
    const t = await saveTeam(team)
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Add a player' }))
    const dialog = screen.getByRole('dialog')
    const next = within(dialog).getByRole('button', { name: 'Next' })
    expect(next.disabled).toBe(true) // a first name is required
    await user.type(within(dialog).getByLabelText('First name'), 'Ann{enter}')
    await user.click(within(within(dialog).getByRole('group', { name: 'Strengths' })).getByRole('button', { name: 'Making contact' }))
    await user.click(within(dialog).getByRole('button', { name: 'Save and add next' }))
    await user.type(within(dialog).getByLabelText('First name'), 'Bo{enter}')
    await user.click(within(within(dialog).getByRole('group', { name: 'Needs work' })).getByRole('button', { name: 'Throwing accuracy' }))
    await user.click(within(dialog).getByRole('button', { name: 'Save and finish' }))
    await waitFor(async () => expect(await db.players.count()).toBe(2))
    const rows = await db.players.toArray()
    expect(rows.find((p) => p.first === 'Ann')).toMatchObject({ strengths: ['contact'], teamId: t.id })
    expect(rows.find((p) => p.first === 'Bo').weaknesses).toEqual(['throwing'])
  })

  it('will not save a player with no first name', async () => {
    await saveTeam(team)
    await savePlayers((await db.teams.toArray())[0].id, [P({ first: 'Sam' })])
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Edit Sam' }))
    const dialog = screen.getByRole('dialog')
    await user.clear(within(dialog).getByLabelText('First name'))
    expect(within(dialog).getByRole('button', { name: 'Save player' }).disabled).toBe(true)
  })
})
