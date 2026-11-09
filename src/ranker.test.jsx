import { describe, it, expect, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NeedsRanker from './components/NeedsRanker.jsx'
import App from './App.jsx'
import { db, saveTeam, clearEverything, setSetting, exportBackup, importBackup } from './lib/db.js'
import { defaultRules, focusSummary, coachTitle, greeting } from './data/constants.js'
import { buildPlan } from './lib/plan.js'
import { drillById } from './data/drills.js'

function Harness({ division = '12U', start = [] }) {
  const [v, setV] = useState(start)
  return (
    <>
      <NeedsRanker division={division} value={v} onChange={setV} />
      <output data-testid="value">{v.join(',')}</output>
    </>
  )
}
const value = () => screen.getByTestId('value').textContent

describe('NeedsRanker', () => {
  it('moves a skill from the bank into the list, in the order tapped, with no limit', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const bank = () => screen.getByRole('group', { name: 'Skills to add' })
    for (const n of ['Base running', 'Pitching', 'Bunting', 'Making contact', 'Catching the ball']) {
      await user.click(within(bank()).getByRole('button', { name: n }))
    }
    expect(value()).toBe('baserunning,pitching,bunting,contact,catching')
    expect(within(bank()).queryByRole('button', { name: 'Base running' })).toBeNull()
    const items = within(screen.getByRole('list', { name: 'Ranked skills' })).getAllByRole('listitem')
    expect(items).toHaveLength(5)
    expect(items[0].textContent).toContain('Base running')
  })

  it('reorders with the arrows and puts a removed skill back in the bank', async () => {
    const user = userEvent.setup()
    render(<Harness start={['baserunning', 'pitching', 'bunting']} />)
    await user.click(screen.getByRole('button', { name: 'Move Bunting up' }))
    expect(value()).toBe('baserunning,bunting,pitching')
    await user.click(screen.getByRole('button', { name: 'Move Bunting up' }))
    expect(value()).toBe('bunting,baserunning,pitching')
    expect(screen.getByRole('button', { name: 'Move Bunting up' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Move Pitching down' }).disabled).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Remove Baserunning'.replace('Baserunning', 'Base running') }))
    expect(value()).toBe('bunting,pitching')
    expect(within(screen.getByRole('group', { name: 'Skills to add' })).getByRole('button', { name: 'Base running' })).toBeTruthy()
  })

  it('only offers skills that fit the division', () => {
    render(<Harness division="4U" />)
    expect(screen.queryByRole('button', { name: 'Pitching' })).toBeNull()
  })
})

describe('plans from a long ranked list', () => {
  const team = { id: 't', division: '12U', experience: 'some', rules: defaultRules('12U') }
  const needs = ['baserunning', 'grounders', 'contact', 'pitching', 'flyballs', 'bunting', 'catching']

  it('keeps the whole ranked list on the plan', () => {
    expect(buildPlan({ ...team, needs }, { minutes: 90, coaches: 1, seed: 3 }).focus).toEqual(needs)
  })

  it('gives the top need the most drills across many seeds', () => {
    const hits = Object.fromEntries(needs.map((n) => [n, 0]))
    for (let seed = 1; seed <= 40; seed++) {
      const plan = buildPlan({ ...team, needs }, { minutes: 90, coaches: 1, seed })
      for (const b of plan.blocks) {
        const ids = b.kind === 'drill' ? [b.drillId] : b.kind === 'stations' ? b.stations : []
        for (const id of ids) for (const n of drillById(id).needs) if (n in hits) hits[n]++
      }
    }
    expect(hits.baserunning).toBeGreaterThan(hits.bunting)
    expect(hits.baserunning).toBeGreaterThan(hits.catching)
  })
})

describe('names and wording', () => {
  it('titles the coach without doubling Coach', () => {
    expect(coachTitle('Chris')).toBe('Coach Chris')
    expect(coachTitle('  coach  Pat ')).toBe('coach Pat')
    expect(coachTitle('')).toBe('')
  })
  it('greets by time of day', () => {
    expect(greeting('Chris', new Date(2026, 10, 9, 8))).toBe('Good morning, Coach Chris')
    expect(greeting('', new Date(2026, 10, 9, 19))).toBe('Good evening')
  })
  it('summarises long lists', () => {
    expect(focusSummary(['baserunning', 'pitching'])).toBe('Base running, Pitching')
    expect(focusSummary(['baserunning', 'pitching', 'bunting', 'contact', 'catching'])).toBe('Base running, Pitching, Bunting and 2 more')
    expect(focusSummary([])).toBe('general')
  })
})

describe('shared plan text', () => {
  it('is signed by the coach when there is a name', async () => {
    const { planText } = await import('./lib/share.js')
    const t = { name: 'Hawks', division: '10U', experience: 'some', needs: ['grounders'], rules: defaultRules('10U') }
    const plan = buildPlan(t, { minutes: 60, coaches: 1, seed: 2 })
    expect(planText(plan, t, 'Sam')).toContain('From Coach Sam, made with AttaCoach')
    expect(planText(plan, t)).toContain('Made with AttaCoach')
  })
})

describe('coach name in the app', () => {
  beforeEach(async () => {
    await clearEverything()
    window.location.hash = ''
  })
  const team = { name: 'Hawks', division: '10U', experience: 'some', needs: ['grounders', 'contact'], rules: defaultRules('10U') }

  it('asks older installs once, and saves the name', async () => {
    await saveTeam(team)
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText('What should we call you?'), 'Sam')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText(/Coach Sam/)).toBeTruthy()
    expect((await db.settings.get('coachName')).value).toBe('Sam')
  })

  it('can be skipped for now', async () => {
    await saveTeam(team)
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Not now' }))
    expect(screen.queryByLabelText('What should we call you?')).toBeNull()
  })

  it('edits the name on the Team tab', async () => {
    await saveTeam(team)
    await setSetting('coachName', 'Sam')
    const user = userEvent.setup()
    window.location.hash = '#/team'
    render(<App />)
    await user.click((await screen.findAllByRole('button', { name: 'Edit' }))[0])
    const input = await screen.findByLabelText('Your name')
    await user.clear(input)
    await user.type(input, 'Coach Dana')
    await user.click(screen.getByRole('button', { name: 'Save name' }))
    expect(await screen.findByText('Coach Dana')).toBeTruthy()
    expect((await db.settings.get('coachName')).value).toBe('Coach Dana')
  })

  it('keeps the name in a backup', async () => {
    await saveTeam(team)
    await setSetting('coachName', 'Sam')
    const data = await exportBackup()
    expect(data.coachName).toBe('Sam')
    await clearEverything()
    await importBackup(JSON.parse(JSON.stringify(data)))
    expect((await db.settings.get('coachName')).value).toBe('Sam')
  })
})
