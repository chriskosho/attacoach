// Goal-based practice plan engine. Pure functions, no UI or storage.
import { DRILLS, drillById } from '../data/drills.js'
import { divIndex, levelIndex, MAX_LEVEL_FOR, MAX_BLOCK } from '../data/constants.js'
import { OPENERS, CLOSERS, bandFor, pick } from '../data/motivation.js'
import { needLabel } from '../data/constants.js'

// Small seeded random generator so a given seed always builds the same plan.
export function rng(seed) {
  let a = 0
  for (const ch of String(seed)) a = (a * 31 + ch.charCodeAt(0)) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function fitsDivision(drill, division) {
  const d = divIndex(division)
  return d >= divIndex(drill.ages[0]) && d <= divIndex(drill.ages[1])
}

export function rulesAllow(drill, rules = {}) {
  return (drill.requires ?? []).every((r) => rules[r])
}

export function levelAllowed(drill, experience, showAll = false) {
  if (showAll) return true
  return levelIndex(drill.level) <= levelIndex(MAX_LEVEL_FOR[experience] ?? 'advanced')
}

// Drills a team can use: right age, rules allow it, and within the coach's level.
export function eligibleDrills(team, { showAllLevels = false } = {}) {
  return DRILLS.filter(
    (d) => fitsDivision(d, team.division) && rulesAllow(d, team.rules) && levelAllowed(d, team.experience, showAllLevels),
  )
}

// How well a drill serves today's focus. Earlier needs weigh more.
export function needScore(drill, focus = []) {
  let score = 0
  focus.forEach((need, i) => {
    if (drill.needs.includes(need)) score += Math.max(1, 3 - i)
  })
  return score
}

export function blockLength(drill, division) {
  return Math.min(drill.minutes, MAX_BLOCK[division] ?? 15)
}

export function blockMinutes(block) {
  if (block.kind === 'stations') return block.stationMinutes * block.stations.length
  return block.minutes
}

export function totalMinutes(plan) {
  return plan.blocks.reduce((sum, b) => sum + blockMinutes(b), 0)
}

export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

let idCounter = 0
const newId = (prefix) => `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`

/**
 * Build a practice plan.
 * team:    { division, rules, experience, needs }
 * options: { minutes, coaches, focus, seed }
 */
export function buildPlan(team, options = {}) {
  const minutes = options.minutes ?? 60
  const coaches = Math.max(1, options.coaches ?? 1)
  const focus = (options.focus?.length ? options.focus : team.needs ?? []).slice(0, 3)
  const seed = options.seed ?? Date.now()
  const random = rng(seed)
  const division = team.division
  const young = divIndex(division) <= divIndex('6U')

  const pool = eligibleDrills(team)
  const used = new Set()
  const take = (drill) => {
    used.add(drill.id)
    return drill
  }

  // Ranked list for one category set or group, best first. Random jitter keeps plans varied.
  const ranked = (filter, needFocus = focus) =>
    pool
      .filter((d) => !used.has(d.id) && filter(d))
      .map((d) => ({ d, s: needScore(d, needFocus) * 10 + levelIndex(d.level) * (team.experience === 'experienced' ? 1.5 : 0) + random() * 4 }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.d)

  const blocks = []
  let left = minutes

  // Closing huddle and finishing game are reserved first so they always fit.
  const huddle = minutes >= 60 ? 5 : 4
  left -= huddle

  // 1. Warm-up.
  const warmups = ranked((d) => d.category === 'warmup')
  const firstWarm = warmups.find((d) => d.group === 'team') ?? warmups[0]
  if (firstWarm) {
    const m = blockLength(firstWarm, division)
    blocks.push({ id: newId('b'), kind: 'drill', drillId: take(firstWarm).id, minutes: m })
    left -= m
  }
  // Arm care before throwing for kid-pitch ages when time allows.
  const arm = pool.find((d) => d.id === 'arm-care' && !used.has(d.id))
  if (arm && minutes >= 75) {
    blocks.push({ id: newId('b'), kind: 'drill', drillId: take(arm).id, minutes: arm.minutes })
    left -= arm.minutes
  }

  // 2. Throwing every practice from 8U up (catch play is the base of everything).
  if (!young) {
    const prog = pool.find((d) => d.id === 'throwing-progression')
    if (prog) {
      const m = minutes <= 45 ? 8 : blockLength(prog, division)
      blocks.push({ id: newId('b'), kind: 'drill', drillId: take(prog).id, minutes: m })
      left -= m
    }
  }

  // 3. Reserve a finishing game.
  const games = ranked((d) => d.category === 'game')
  let finisher = games.find((d) => blockLength(d, division) <= Math.max(6, Math.round(minutes * 0.2)))
  let finisherMinutes = 0
  if (finisher) {
    finisherMinutes = Math.min(blockLength(finisher, division), Math.max(6, Math.round(minutes * 0.18)))
    used.add(finisher.id)
    left -= finisherMinutes
  }

  // Water breaks: one per 40 minutes of practice.
  const breaks = Math.floor(minutes / 40)
  left -= breaks * 2

  // 4. Main work, aimed at the focus needs in turn.
  const stationCount = Math.min(coaches, 3)
  const stationMinutes = Math.min(MAX_BLOCK[division], young ? 6 : 10)
  let needTurn = 0
  let lastWasStations = false
  const categoryCount = {}
  const overused = (d) => (categoryCount[d.category] ?? 0) >= 2
  const nextNeed = () => (focus.length ? focus[needTurn++ % focus.length] : null)

  const bestFor = (need, filter) => {
    const preferred = need ? ranked((d) => filter(d) && d.needs.includes(need) && !overused(d), [need, ...focus]) : []
    return preferred[0] ?? ranked((d) => filter(d) && !overused(d))[0] ?? ranked(filter)[0]
  }
  const count = (d) => {
    categoryCount[d.category] = (categoryCount[d.category] ?? 0) + 1
  }

  let guard = 0
  while (left >= 5 && guard++ < 20) {
    const roundLength = stationCount * stationMinutes
    const canStations = stationCount >= 2 && left >= roundLength && !lastWasStations
    if (canStations) {
      const picks = []
      for (let i = 0; i < stationCount; i++) {
        const d = bestFor(nextNeed(), (x) => x.group === 'small' && x.category !== 'warmup' && x.category !== 'game')
        if (!d) break
        take(d)
        count(d)
        picks.push(d.id)
      }
      if (picks.length >= 2) {
        blocks.push({ id: newId('b'), kind: 'stations', stations: picks, stationMinutes })
        left -= picks.length * stationMinutes
        lastWasStations = true
        continue
      }
      picks.forEach((id) => used.delete(id))
    }
    // Prefer a drill that fits the time left over cutting a long drill short.
    const notWarmOrGame = (x) => x.category !== 'warmup' && x.category !== 'game'
    const fits = (x) => left >= blockLength(x, division) * 0.75
    const need = nextNeed()
    const d = bestFor(need, (x) => notWarmOrGame(x) && fits(x)) ?? bestFor(need, notWarmOrGame)
    if (!d) break
    let m = blockLength(d, division)
    if (m > left) m = left
    take(d)
    count(d)
    blocks.push({ id: newId('b'), kind: 'drill', drillId: d.id, minutes: m })
    left -= m
    lastWasStations = false
  }

  // Leftover minutes go to the finishing game (or the last block).
  if (finisher) {
    blocks.push({ id: newId('b'), kind: 'drill', drillId: finisher.id, minutes: finisherMinutes + Math.max(0, left) })
  } else if (left > 0 && blocks.length) {
    const last = blocks[blocks.length - 1]
    if (last.kind === 'stations') blocks.push({ id: newId('b'), kind: 'break', minutes: left })
    else last.minutes += left
  }

  // Insert water breaks at roughly even spacing, never first or last.
  insertBreaks(blocks, breaks)

  const band = bandFor(division)
  const lead = focus[0] ? needLabel(focus[0]).toLowerCase() : 'the basics'
  blocks.push({ id: newId('b'), kind: 'huddle', minutes: huddle })

  return {
    id: newId('plan'),
    teamId: team.id,
    createdAt: new Date().toISOString(),
    date: options.date ?? localDate(),
    minutes,
    coaches,
    focus,
    seed: String(seed),
    opener: pick(OPENERS[band], seed).replace('{need}', lead),
    closer: pick(CLOSERS[band], String(seed) + 'c'),
    blocks,
  }
}

function insertBreaks(blocks, count) {
  if (count <= 0) return
  const total = blocks.reduce((s, b) => s + blockMinutes(b), 0)
  const step = total / (count + 1)
  let elapsed = 0
  let lastBreak = 0
  let placed = 0
  for (let i = 0; i < blocks.length - 1 && placed < count; i++) {
    elapsed += blockMinutes(blocks[i])
    const target = step * (placed + 1)
    // Near the even spacing point, and at least 15 minutes since the last break.
    if (elapsed >= target - 5 && elapsed - lastBreak >= 15) {
      blocks.splice(i + 1, 0, { id: newId('b'), kind: 'break', minutes: 2 })
      i++
      placed++
      lastBreak = elapsed
    }
  }
  // Short plans with few blocks: put any remaining break before the last block.
  for (; placed < count; placed++) blocks.splice(Math.max(1, blocks.length - 1), 0, { id: newId('b'), kind: 'break', minutes: 2 })
}

// ---------------------------------------------------------------- Editing helpers

export function drillIdsInPlan(plan) {
  return plan.blocks.flatMap((b) => (b.kind === 'stations' ? b.stations : b.drillId ? [b.drillId] : []))
}

// Other drills that could replace one in a plan: same category first, then shared needs.
export function alternatives(team, drillId, plan, { showAllLevels = false } = {}) {
  const current = drillById(drillId)
  const inPlan = new Set(drillIdsInPlan(plan))
  const pool = eligibleDrills(team, { showAllLevels }).filter((d) => !inPlan.has(d.id))
  const focus = plan.focus ?? []
  return pool
    .map((d) => ({
      d,
      s:
        (current && d.category === current.category ? 20 : 0) +
        (current ? d.needs.filter((n) => current.needs.includes(n)).length * 4 : 0) +
        needScore(d, focus) * 2,
    }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.d)
}

const mapBlocks = (plan, fn) => ({ ...plan, blocks: plan.blocks.map(fn) })

export function swapDrill(plan, blockId, newDrillId, stationIndex = null) {
  return mapBlocks(plan, (b) => {
    if (b.id !== blockId) return b
    if (b.kind === 'stations' && stationIndex != null) {
      const stations = [...b.stations]
      stations[stationIndex] = newDrillId
      return { ...b, stations }
    }
    return { ...b, drillId: newDrillId }
  })
}

export function setBlockMinutes(plan, blockId, minutes) {
  const m = Math.max(1, Math.min(60, Math.round(minutes)))
  return mapBlocks(plan, (b) => {
    if (b.id !== blockId) return b
    return b.kind === 'stations' ? { ...b, stationMinutes: m } : { ...b, minutes: m }
  })
}

export function moveBlock(plan, blockId, delta) {
  const blocks = [...plan.blocks]
  const i = blocks.findIndex((b) => b.id === blockId)
  const j = i + delta
  if (i < 0 || j < 0 || j >= blocks.length) return plan
  ;[blocks[i], blocks[j]] = [blocks[j], blocks[i]]
  return { ...plan, blocks }
}

export function removeBlock(plan, blockId, stationIndex = null) {
  if (stationIndex != null) {
    const blocks = plan.blocks
      .map((b) => {
        if (b.id !== blockId) return b
        const stations = b.stations.filter((_, i) => i !== stationIndex)
        if (stations.length === 1) return { id: b.id, kind: 'drill', drillId: stations[0], minutes: b.stationMinutes }
        return { ...b, stations }
      })
    return { ...plan, blocks }
  }
  return { ...plan, blocks: plan.blocks.filter((b) => b.id !== blockId) }
}

// Adds a drill just before the closing huddle.
export function addDrill(plan, drillId, division) {
  const d = drillById(drillId)
  const block = { id: newId('b'), kind: 'drill', drillId, minutes: d ? blockLength(d, division) : 10 }
  const blocks = [...plan.blocks]
  const huddleAt = blocks.findIndex((b) => b.kind === 'huddle')
  blocks.splice(huddleAt < 0 ? blocks.length : huddleAt, 0, block)
  return { ...plan, blocks }
}

export function addBreak(plan, afterBlockId) {
  const blocks = [...plan.blocks]
  const i = blocks.findIndex((b) => b.id === afterBlockId)
  blocks.splice(i + 1, 0, { id: newId('b'), kind: 'break', minutes: 2 })
  return { ...plan, blocks }
}

// Flat schedule with start times, used by the plan view, the timer and sharing.
export function schedule(plan) {
  let at = 0
  return plan.blocks.map((b) => {
    const start = at
    at += blockMinutes(b)
    return { block: b, start, end: at }
  })
}

export function hasPitching(plan) {
  // Drills where players actually pitch, so pitch counts matter.
  return drillIdsInPlan(plan).some((id) => {
    const d = drillById(id)
    return d && (d.category === 'pitching' || (d.requires ?? []).includes('kidPitch'))
  })
}

export function fmtClock(totalMin) {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}:${String(m).padStart(2, '0')}`
}
