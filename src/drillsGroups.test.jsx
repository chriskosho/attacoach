// Stage 11E: the Drills tab groups drills under sticky category headings with counts.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { saveTeam, clearEverything } from './lib/db.js'
import { defaultRules, CATEGORIES } from './data/constants.js'

const team = { name: 'Blue Jays', division: '10U', experience: 'some', needs: [], rules: defaultRules('10U') }
const heads = () => [...document.querySelectorAll('.drill-group-head')]
const countOf = (h) => Number(h.querySelector('span').textContent)
const rowsIn = (h) => h.closest('section').querySelectorAll('.drill-row').length

describe('Drills tab headings', () => {
  beforeEach(async () => {
    await clearEverything()
    window.location.hash = '#/drills'
  })

  it('shows a heading per category in the usual order, each with its drill count', async () => {
    await saveTeam({ ...team })
    render(<App />)
    await screen.findByRole('button', { name: 'Add your own drill' })
    const hs = heads()
    expect(hs.length).toBeGreaterThan(3)
    const order = CATEGORIES.map((c) => c.label)
    const labels = hs.map((h) => h.firstChild.textContent.trim())
    expect(labels).toEqual(order.filter((l) => labels.includes(l)))
    for (const h of hs) expect(countOf(h)).toBe(rowsIn(h))
    // The total line still counts every drill.
    const total = hs.reduce((n, h) => n + countOf(h), 0)
    expect(screen.getByText(`${total} drills`)).toBeTruthy()
  })

  it('search still finds drills and hides headings for categories with no results', async () => {
    const user = userEvent.setup()
    await saveTeam({ ...team })
    render(<App />)
    const search = await screen.findByLabelText('Search drills')
    const before = heads().length
    await user.type(search, 'bunt')
    const after = heads()
    expect(after.length).toBeGreaterThan(0)
    expect(after.length).toBeLessThan(before)
    for (const h of after) expect(rowsIn(h)).toBe(countOf(h))
    await user.clear(screen.getByLabelText('Search drills'))
    expect(heads().length).toBe(before)
  })

  it('a category filter leaves one heading, and nothing matching leaves no headings', async () => {
    const user = userEvent.setup()
    await saveTeam({ ...team })
    render(<App />)
    await user.selectOptions(await screen.findByLabelText('Category'), 'infield')
    expect(heads().map((h) => h.firstChild.textContent.trim())).toEqual(['Infield'])
    await user.type(screen.getByLabelText('Search drills'), 'zzzzqqq')
    expect(heads()).toHaveLength(0)
    expect(screen.getByText('No drills match these filters.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add your own drill' })).toBeTruthy()
    expect(within(document.body).getByLabelText('Search drills')).toBeTruthy()
  })
})
