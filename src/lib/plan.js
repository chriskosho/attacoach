// Goal-based practice plan engine. Pure functions, no UI or storage.
import { DRILLS, drillById } from '../data/drills.js'
import { divIndex, levelIndex, MAX_LEVEL_FOR, MAX_BLOCK, SINGLE_GEAR } from '../data/constants.js'
import { OPENERS, CLOSERS, bandFor, pick } from '../data/motivation.js'
import { needLabel, starterNeeds } from '../data/constants.js'

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

// ---------------------------------------------------------------- Space, gear and staffing

// Spaces a practice has. A full field also has open grass.
export function availableSpaces(spaces) {
  const list = spaces?.length ? spaces : ['field']
  const set = new Set(list)
  if (set.has('field')) set.add('open')
  return set
}

export const spaceFits = (drill, avail) => drill.where.some((w) => avail.has(w))

// Gear the drill is built around that the team did not list. When a team has not said what it
// has, assume the common basics, so nobody gets a machine drill without owning a machine.
export const COMMON_GEAR = ['tee', 'cones', 'catcherGear', 'lscreen']
export const missingGear = (drill, equipment) => drill.gear.filter((g) => !(equipment ?? COMMON_GEAR).includes(g))

// Players run their own station only from 8U up, and never with a swinging bat.
export const staffFor = (drill, young) => (drill.staff === 'kids' && (young || drill.bat) ? 'watch' : drill.staff)

/**
 * Who does what, given the adults on hand. The head coach floats when the helpers can run the
 * stations that need an adult, and otherwise runs one. `role` lets the coach overrule it.
 */
export function staffingFor({ adults = 1, role = 'auto' } = {}) {
  const a = Math.max(1, adults)
  const helpers = a - 1
  let coachRole = role === 'float' || role === 'run' ? role : helpers >= 2 ? 'float' : 'run'
  if (a === 1) coachRole = 'run'
  return { adults: a, helpers, coachRole, runSlots: coachRole === 'float' ? helpers : a }
}

// How many watch-only stations can be covered once `runUsed` adults are running stations.
function watchCapacity(st, runUsed) {
  if (st.coachRole === 'float') return 2 + Math.max(0, st.helpers - runUsed) * 2
  if (st.adults === 1) return 0
  // Adults running a station can each keep an eye on one station set up beside them.
  return Math.max(0, st.adults - runUsed) * 2 + runUsed
}

// About four kids a group to start with. A guide for the first split; coaches can change it.
export function stationTarget(kids) {
  if (kids < 6) return 1
  return Math.max(2, Math.min(5, Math.round(kids / 4)))
}

// Split kids into n rotating groups as evenly as possible: 14 into 4 is [4, 4, 3, 3].
export function groupSizes(kids, n) {
  const base = Math.floor(kids / n)
  return Array.from({ length: n }, (_, i) => base + (i < kids % n ? 1 : 0))
}

// Which adult covers each station. Run stations get the coach first (the one needing the most
// skill) when the coach is not floating; watch stations go to the floater, a free helper, or sit
// next to a station an adult is running.
export function assignStaff(drills, st, young) {
  const types = drills.map((d) => staffFor(d, young))
  const out = drills.map((_, i) => ({ type: types[i], who: null, helper: null, near: null }))
  const runIdx = types.map((t, i) => (t === 'run' ? i : -1)).filter((i) => i >= 0)
  runIdx.sort((x, y) => levelIndex(drills[y].level) - levelIndex(drills[x].level) || (drills[y].bat ? 1 : 0) - (drills[x].bat ? 1 : 0))
  let helper = 0
  runIdx.forEach((i, k) => {
    if (st.coachRole === 'run' && k === 0) out[i].who = 'coach'
    else {
      helper++
      out[i].who = 'helper'
      out[i].helper = helper
    }
  })
  // A coach who is not running a station this round keeps an eye on up to two.
  const coachRunning = out.some((o) => o.who === 'coach')
  let floaterLeft = coachRunning ? 0 : 2
  const freeHelpers = []
  for (let h = helper + 1; h <= st.helpers; h++) freeHelpers.push(h, h)
  const runners = [...runIdx]
  out.forEach((o, i) => {
    if (o.type !== 'watch') return
    if (floaterLeft > 0) {
      floaterLeft--
      o.who = 'coach'
    } else if (freeHelpers.length) {
      o.who = 'helper'
      o.helper = freeHelpers.shift()
    } else if (runners.length) {
      o.near = runners.shift()
    }
  })
  return out
}

/**
 * Build a practice plan.
 * team:    { division, rules, experience, needs }
 * options: { minutes, adults, kids, coachRole, spaces, equipment, athletic, focus, recent, practiceName, seed, date }
 *   adults    everyone helping, counting the head coach (older plans called this coaches)
 *   kids      players expected today
 *   coachRole 'auto' (default), 'float' or 'run'
 *   spaces    ['field'], ['cage', 'open'] and so on
 *   equipment ids the team has, or null when unknown
 *   recent    the team's other plans from this week, so the week stays balanced
 * Everything except minutes is optional, and a plan is always built.
 */
export function buildPlan(team, options = {}) {
  const minutes = options.minutes ?? 60
  const adults = Math.max(1, options.adults ?? options.coaches ?? 1)
  const kids = Math.max(1, Math.round(options.kids ?? 12))
  // Any number of ranked needs. Earlier ones get more of the practice.
  const focus = options.focus?.length ? options.focus : team.needs?.length ? team.needs : starterNeeds(team.division)
  const seed = options.seed ?? Date.now()
  const random = rng(seed)
  const division = team.division
  const young = divIndex(division) <= divIndex('6U')
  const spaces = options.spaces?.length ? options.spaces : ['field']
  const avail = availableSpaces(spaces)
  const equipment = options.equipment ?? null
  const athletic = !!options.athletic
  const st = staffingFor({ adults, role: options.coachRole })

  // Drills that fit today's space. If a small space leaves too little to choose from, use the
  // rest too: a thin plan is worse than an imperfect one.
  const eligible = eligibleDrills(team)
  const fitting = eligible.filter((d) => spaceFits(d, avail))
  const spaceTight = fitting.filter((d) => d.category !== 'warmup').length < 8
  const pool = spaceTight ? eligible : fitting

  // This week's other plans: needs they already covered weigh a little less today.
  const recentNeeds = {}
  for (const p of options.recent ?? []) {
    for (const id of drillIdsInPlan(p)) for (const n of drillById(id)?.needs ?? []) recentNeeds[n] = (recentNeeds[n] ?? 0) + 1
  }
  // Make the most of what today offers: a cage day leans to hitting, and gear the team listed gets used.
  const featureBonus = (d) =>
    (avail.has('cage') && d.category === 'hitting' && d.where.includes('cage') ? 12 : 0) +
    (equipment && d.gear.length && d.gear.every((g) => equipment.includes(g)) && d.gear.some((g) => !COMMON_GEAR.includes(g)) ? 6 : 0)
  const weekPenalty = (d) => Math.min(8, d.needs.reduce((s, n) => s + (recentNeeds[n] ?? 0), 0) * 0.8)

  const used = new Set()
  const take = (drill) => {
    used.add(drill.id)
    return drill
  }

  // Ranked list, best first. Random jitter keeps plans varied; missing gear, a poor space fit and
  // needs covered earlier this week nudge a drill down without ruling it out.
  const ranked = (filter, needFocus = focus, extra = () => 0) =>
    pool
      .filter((d) => !used.has(d.id) && !d.athletic && filter(d))
      .map((d) => ({
        d,
        s:
          needScore(d, needFocus) * 10 +
          levelIndex(d.level) * (team.experience === 'experienced' ? 1.5 : 0) +
          random() * 4 -
          missingGear(d, equipment).length * 12 -
          (spaceFits(d, avail) ? 0 : 25) -
          weekPenalty(d) +
          featureBonus(d) +
          extra(d),
      }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.d)

  const blocks = []
  let left = minutes

  // Closing huddle and finishing game are reserved first so they always fit.
  const huddle = minutes >= 60 ? 5 : 4
  left -= huddle

  // 1. Warm-up: the athletic routine replaces the usual one when it is switched on.
  const athleticWarm = athletic ? eligibleDrills(team, { showAllLevels: true }).find((d) => d.athletic) : null
  const warmups = ranked((d) => d.category === 'warmup')
  const firstWarm = athleticWarm ?? warmups.find((d) => d.group === 'team') ?? warmups[0]
  if (firstWarm) {
    const m = athleticWarm ? athleticWarm.minutes : blockLength(firstWarm, division)
    blocks.push({ id: newId('b'), kind: 'drill', drillId: take(firstWarm).id, minutes: m })
    left -= m
  }
  // Arm care before throwing for kid-pitch ages when time allows.
  const arm = pool.find((d) => d.id === 'arm-care' && !used.has(d.id))
  if (arm && minutes >= 75) {
    blocks.push({ id: newId('b'), kind: 'drill', drillId: take(arm).id, minutes: arm.minutes })
    left -= arm.minutes
  }

  // 2. Throwing every practice from 8U up (catch play is the base of everything), where there is room.
  if (!young) {
    const prog = pool.find((d) => d.id === 'throwing-progression' && spaceFits(d, avail))
    if (prog) {
      const m = minutes <= 45 ? 8 : blockLength(prog, division)
      blocks.push({ id: newId('b'), kind: 'drill', drillId: take(prog).id, minutes: m })
      left -= m
    }
  }

  // 3. Reserve a finishing game.
  const games = ranked((d) => d.category === 'game' && spaceFits(d, avail))
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
  // Stations keep everyone busy. Young teams with one adult stay together instead.
  let stationCount = young && st.adults === 1 ? 1 : stationTarget(kids)
  if (options.stations) stationCount = Math.max(1, Math.min(6, options.stations))
  const stationMinutes = Math.min(MAX_BLOCK[division], young ? 6 : 10)
  let lastWasStations = false
  const categoryCount = {}
  const overused = (d) => (categoryCount[d.category] ?? 0) >= 2
  // A cage day without a field is a hitting day: hitting needs move to the front of today's rotation.
  const HITTING = ['contact', 'approach', 'bunting']
  let dayFocus = focus
  if (avail.has('cage') && !avail.has('field')) {
    const hit = [...focus.filter((n) => HITTING.includes(n)), ...HITTING.filter((n) => !focus.includes(n) && pool.some((d) => d.needs.includes(n)))]
    dayFocus = [...hit, ...focus.filter((n) => !HITTING.includes(n))]
  }
  // Weighted rotation: rank 1 gets about four turns for every one that rank 4 and below get.
  const served = dayFocus.map(() => 0)
  const nextNeed = () => {
    if (!dayFocus.length) return null
    let best = 0
    let bestScore = Infinity
    dayFocus.forEach((_, i) => {
      const s = (served[i] + 1) / Math.max(1, 4 - i)
      if (s < bestScore) {
        best = i
        bestScore = s
      }
    })
    served[best]++
    return dayFocus[best]
  }

  const bestFor = (need, filter, extra) => {
    const preferred = need ? ranked((d) => filter(d) && d.needs.includes(need) && !overused(d), [need, ...focus], extra) : []
    return preferred[0] ?? ranked((d) => filter(d) && !overused(d), focus, extra)[0] ?? ranked(filter, focus, extra)[0]
  }
  const count = (d) => {
    categoryCount[d.category] = (categoryCount[d.category] ?? 0) + 1
  }

  // One round of stations: drills that today's adults can cover, sharing single pieces of gear.
  const stationRound = (n) => {
    const picks = []
    let runUsed = 0
    let watchUsed = 0
    const gearUsed = new Set()
    const groupSize = Math.ceil(kids / n)
    // Prefer drills that suit the group size. A crowded station is allowed, just ranked lower.
    const sizeFit = (d) => -Math.max(0, groupSize - d.cap[1]) * 3
    for (let i = 0; i < n; i++) {
      const fits = (d) => {
        if (d.group !== 'small' || d.category === 'warmup' || d.category === 'game') return false
        if (d.gear.some((g) => SINGLE_GEAR.includes(g) && gearUsed.has(g))) return false
        const t = staffFor(d, young)
        const r = runUsed + (t === 'run' ? 1 : 0)
        const w = watchUsed + (t === 'watch' ? 1 : 0)
        return r <= st.runSlots && w <= watchCapacity(st, r)
      }
      const d = bestFor(nextNeed(), fits, sizeFit)
      if (!d) break
      const t = staffFor(d, young)
      if (t === 'run') runUsed++
      if (t === 'watch') watchUsed++
      d.gear.forEach((g) => gearUsed.add(g))
      take(d)
      picks.push(d)
    }
    return picks
  }

  let guard = 0
  while (left >= 5 && guard++ < 20) {
    // Keep the groups small when time is short: shorter stations first, fewer stations last.
    let n = stationCount
    let perStation = stationMinutes
    if (n * perStation > left) perStation = Math.max(6, Math.floor(left / Math.max(n, 1)))
    while (n >= 2 && n * perStation > left) n--
    if (n >= 2 && !lastWasStations) {
      const picks = stationRound(n)
      if (picks.length >= 2) {
        picks.forEach(count)
        blocks.push({
          id: newId('b'),
          kind: 'stations',
          stations: picks.map((d) => d.id),
          stationMinutes: perStation,
          groups: groupSizes(kids, picks.length),
          staff: assignStaff(picks, st, young),
        })
        left -= picks.length * perStation
        lastWasStations = true
        continue
      }
      picks.forEach((d) => used.delete(d.id))
    }
    // Prefer a drill that fits the time left over cutting a long drill short.
    const notWarmOrGame = (x) => x.category !== 'warmup' && x.category !== 'game'
    const fitsTime = (x) => left >= blockLength(x, division) * 0.75
    const need = nextNeed()
    const d = bestFor(need, (x) => notWarmOrGame(x) && fitsTime(x)) ?? bestFor(need, notWarmOrGame)
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
    adults,
    coaches: adults,
    kids,
    coachRole: st.coachRole,
    requestedRole: options.coachRole ?? 'auto',
    spaces,
    equipment,
    athletic,
    practiceName: options.practiceName ?? null,
    stationsRequested: options.stations ?? null,
    focus,
    seed: String(seed),
    opener: pick(OPENERS[band], seed).replace('{need}', lead),
    closer: pick(CLOSERS[band], String(seed) + 'c'),
    blocks,
  }
}

// The same plan rebuilt for a different number of adults (or anything else), keeping its seed so
// most of the drills stay put.
export function rebuildPlan(team, plan, changes = {}) {
  const fresh = buildPlan(team, {
    minutes: plan.minutes,
    adults: plan.adults ?? plan.coaches,
    kids: plan.kids,
    coachRole: plan.requestedRole ?? 'auto',
    spaces: plan.spaces,
    equipment: plan.equipment ?? null,
    athletic: plan.athletic,
    practiceName: plan.practiceName,
    stations: plan.stationsRequested ?? undefined,
    focus: plan.focus,
    date: plan.date,
    seed: plan.seed,
    ...changes,
  })
  return { ...fresh, id: plan.id, createdAt: plan.createdAt }
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
  const avail = availableSpaces(plan.spaces)
  const all = eligibleDrills(team, { showAllLevels }).filter((d) => !inPlan.has(d.id) && !d.athletic)
  // Drills that fit today's space first; the rest only when nothing else would show.
  const fitting = all.filter((d) => spaceFits(d, avail))
  const pool = fitting.length >= 3 ? fitting : all
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

// Re-works who covers each station after the stations change.
function restaff(plan, block, division) {
  if (!block.staff) return block
  const drills = block.stations.map(drillById).filter(Boolean)
  if (drills.length !== block.stations.length) return block
  const young = division ? divIndex(division) <= divIndex('6U') : false
  const st = staffingFor({ adults: plan.adults ?? plan.coaches ?? 1, role: plan.coachRole })
  const kids = block.groups ? block.groups.reduce((a, b) => a + b, 0) : plan.kids ?? 12
  return { ...block, staff: assignStaff(drills, st, young), groups: groupSizes(kids, drills.length) }
}

export function swapDrill(plan, blockId, newDrillId, stationIndex = null, division = null) {
  return mapBlocks(plan, (b) => {
    if (b.id !== blockId) return b
    if (b.kind === 'stations' && stationIndex != null) {
      const stations = [...b.stations]
      stations[stationIndex] = newDrillId
      return restaff(plan, { ...b, stations }, division)
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

export function removeBlock(plan, blockId, stationIndex = null, division = null) {
  if (stationIndex != null) {
    const blocks = plan.blocks
      .map((b) => {
        if (b.id !== blockId) return b
        const stations = b.stations.filter((_, i) => i !== stationIndex)
        if (stations.length === 1) return { id: b.id, kind: 'drill', drillId: stations[0], minutes: b.stationMinutes }
        return restaff(plan, { ...b, stations }, division)
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
