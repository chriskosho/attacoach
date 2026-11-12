// Goal-based practice plan engine. Pure functions, no UI or storage.
import { allDrills, drillById } from '../data/drills.js'
import { divIndex, levelIndex, MAX_LEVEL_FOR, MAX_BLOCK, SINGLE_GEAR } from '../data/constants.js'
import { OPENERS, closerFor, bandFor, pick } from '../data/motivation.js'
import { needLabel, starterNeeds } from '../data/constants.js'
import { sportFits } from './sport.js'

// Small seeded random generator so a given seed always builds the same plan.
import { sameSkillGroup } from '../data/sameSkill.js'

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

// Drills a team can use: its sport, right age, rules allow it, and within the coach's level.
// Drills the coach said not to suggest are left out unless asked for (adding one by hand).
export function eligibleDrills(team, { showAllLevels = false, includeHidden = false } = {}) {
  const hidden = includeHidden ? null : new Set(team.hidden ?? [])
  return allDrills().filter(
    (d) =>
      !d.deleted &&
      !(hidden && hidden.has(d.id)) &&
      sportFits(d, team) &&
      fitsDivision(d, team.division) &&
      rulesAllow(d, team.rules) &&
      levelAllowed(d, team.experience, showAllLevels),
  )
}

// A favorite gets a modest lift in the ranking. The variety rules still apply, so a favorite
// from last practice still steps aside.
export const FAVORITE_BONUS = 9

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

// Drills meant to repeat every practice: they never count against variety.
export const STAPLE_DRILLS = ['throwing-progression', 'arm-care']
export const isStaple = (d) => STAPLE_DRILLS.includes(d.id) || !!d.athletic

// Share of practice minutes reserved for hitting where the space allows it.
export const HIT_SHARE = 0.15

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
 * Who does what, given the adults on hand. The coach always runs a station, so every adult does.
 * (If a coach hands a station over on the day, that is theirs to decide.)
 */
export function staffingFor({ adults = 1 } = {}) {
  const a = Math.max(1, adults)
  return { adults: a, helpers: a - 1, coachRole: 'run', runSlots: a }
}

// How many watch-only stations can be covered once `runUsed` adults are running stations.
function watchCapacity(st, runUsed) {
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
 * options: { minutes, adults, kids, spaces, equipment, athletic, focus, recent, practiceName, seed, date }
 *   adults    everyone helping, counting the head coach (older plans called this coaches)
 *   kids      players expected today
 *   spaces    ['field'], ['cage', 'open'] and so on
 *   equipment ids the team has, or null when unknown
 *   recent    the team's recent plans (see recentPlans), so practices vary and the week stays balanced
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
  const st = staffingFor({ adults })

  // Drills that fit today's space. If a small space leaves too little to choose from, use the
  // rest too: a thin plan is worse than an imperfect one.
  const eligible = eligibleDrills(team)
  const fitting = eligible.filter((d) => spaceFits(d, avail))
  const spaceTight = fitting.filter((d) => d.category !== 'warmup').length < 8
  const pool = spaceTight ? eligible : fitting

  const date = options.date ?? localDate()
  // Recent plans, newest first. Plans from the week before this practice keep the week balanced:
  // needs they already covered weigh a little less today.
  // Kept on the plan in short form, so rebuilding it later looks back on the same practices.
  const history = (options.recent ?? []).map(historyEntry).sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? 1 : -1))
  const weekAgo = localDate(new Date(new Date(`${date}T12:00:00`).getTime() - 6 * 86400000))
  const recentNeeds = {}
  for (const p of history.filter((p) => !p.date || p.date >= weekAgo)) {
    for (const id of p.drills) for (const n of drillById(id)?.needs ?? []) recentNeeds[n] = (recentNeeds[n] ?? 0) + 1
  }
  // Drills from the last few practices step aside so the team sees something new: the last
  // practice's drills strongly, the one before less, older ones a little. Staples are meant to repeat.
  const lastIds = new Set(history[0]?.drills ?? [])
  const prevIds = new Set(history[1]?.drills ?? [])
  const olderUse = {}
  for (const p of history.slice(2)) for (const id of p.drills) olderUse[id] = (olderUse[id] ?? 0) + 1
  const repeats = (d) => !isStaple(d) && lastIds.has(d.id)
  const twoBack = (d) => !isStaple(d) && prevIds.has(d.id)
  const historyPenalty = (d) => (isStaple(d) ? 0 : lastIds.has(d.id) ? 40 : prevIds.has(d.id) ? 28 : (olderUse[d.id] ?? 0) * 16)
  // Make the most of what today offers: a cage day leans to hitting, and gear the team listed gets used.
  const featureBonus = (d) =>
    (avail.has('cage') && d.category === 'hitting' && d.where.includes('cage') ? 12 : 0) +
    (equipment && d.gear.length && d.gear.every((g) => equipment.includes(g)) && d.gear.some((g) => !COMMON_GEAR.includes(g)) ? 6 : 0)
  const weekPenalty = (d) => Math.min(8, d.needs.reduce((s, n) => s + (recentNeeds[n] ?? 0), 0) * 0.8)

  const favorites = new Set(team.favorites ?? [])
  const favoriteBonus = (d) => (favorites.has(d.id) ? FAVORITE_BONUS : 0)
  const used = new Set(options.exclude ?? [])
  // Drills that teach the same skill the same way: once one is in today's plan, the others stay out.
  // Counted, so a station round that is thrown away gives its groups back.
  const groupsTaken = new Map()
  const holdGroup = (id, n) => {
    const g = sameSkillGroup(id)
    if (g) groupsTaken.set(g, (groupsTaken.get(g) ?? 0) + n)
  }
  for (const id of options.exclude ?? []) holdGroup(id, 1)
  const sameSkillTaken = (d) => (groupsTaken.get(sameSkillGroup(d.id)) ?? 0) > 0
  let sharedLast = 0
  let sharedTwo = 0
  const take = (drill) => {
    if (repeats(drill)) sharedLast++
    if (twoBack(drill)) sharedTwo++
    used.add(drill.id)
    holdGroup(drill.id, 1)
    return drill
  }
  const giveBack = (drill) => {
    if (repeats(drill)) sharedLast--
    if (twoBack(drill)) sharedTwo--
    used.delete(drill.id)
    holdGroup(drill.id, -1)
  }

  // Ranked list, best first. Random jitter keeps plans varied; missing gear, a poor space fit and
  // needs covered earlier this week nudge a drill down without ruling it out.
  const ranked = (filter, needFocus = focus, extra = () => 0) =>
    pool
      .filter((d) => !used.has(d.id) && !sameSkillTaken(d) && !d.athletic && filter(d))
      .map((d) => ({
        d,
        s:
          needScore(d, needFocus) * 10 +
          levelIndex(d.level) * (team.experience === 'experienced' ? 1.5 : 0) +
          random() * 4 -
          missingGear(d, equipment).length * 12 -
          (spaceFits(d, avail) ? 0 : 25) -
          weekPenalty(d) -
          historyPenalty(d) +
          featureBonus(d) +
          favoriteBonus(d) +
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
  const athleticWarm = athletic ? eligibleDrills(team, { showAllLevels: true }).find((d) => d.athletic && !used.has(d.id)) : null
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
    const prog = pool.find((d) => d.id === 'throwing-progression' && !used.has(d.id) && spaceFits(d, avail))
    if (prog) {
      const m = minutes <= 45 ? 8 : blockLength(prog, division)
      blocks.push({ id: newId('b'), kind: 'drill', drillId: take(prog).id, minutes: m })
      left -= m
    }
  }

  // 3. Reserve a finishing game, never the same one as last practice when another fits.
  const lastGame = history[0]?.game ?? null
  // Games count history double: a favorite game should not close every other practice.
  const games = ranked((d) => d.category === 'game' && spaceFits(d, avail), focus, (d) => -historyPenalty(d)).filter((d) => blockLength(d, division) <= Math.max(6, Math.round(minutes * 0.2)))
  let finisher = games.find((d) => d.id !== lastGame) ?? games[0]
  let finisherMinutes = 0
  if (finisher) {
    finisherMinutes = Math.min(blockLength(finisher, division), Math.max(6, Math.round(minutes * 0.18)))
    take(finisher)
    left -= finisherMinutes
  }

  // Water breaks: one per 40 minutes of practice.
  const breaks = Math.floor(minutes / 40)
  left -= breaks * 2

  // Must-haves, filled before need-based picks. The coach can still remove or swap any of them.
  // Hitting in every practice where the space allows a hitting drill, at least about 15% of the
  // minutes. Kid-pitch teams on a long field or cage practice get pitching or catcher work.
  const hittingFits = (d) => d.category === 'hitting' && spaceFits(d, avail)
  const canHit = (avail.has('field') || avail.has('cage') || avail.has('open')) && pool.some((d) => hittingFits(d) && !d.athletic)
  const hitTarget = canHit ? Math.round(minutes * HIT_SHARE) - 2 : 0
  let hitMinutes = 0
  const pitchFits = (d) => (d.category === 'pitching' || d.category === 'catcher') && spaceFits(d, avail)
  let pitchNeeded =
    !!team.rules?.kidPitch && minutes >= 75 && (avail.has('field') || avail.has('cage')) && pool.some((d) => pitchFits(d) && !d.athletic) ? 1 : 0
  // Must-haves still open, in order. Within one station round each kind is filled at most once.
  const mustsFor = (roundHit = 0, roundPitch = 0) => [
    ...(hitMinutes < hitTarget && roundHit === 0 ? [hittingFits] : []),
    ...(pitchNeeded > 0 && roundPitch === 0 ? [pitchFits] : []),
  ]

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
  // Needs the last practice spent time on start a little ahead, so lower-ranked needs get their
  // turn across practices instead of the same top needs filling every short practice.
  const lastDrills = (history[0]?.drills ?? []).map(drillById).filter((d) => d && !isStaple(d))
  const served = dayFocus.map((n) => lastDrills.filter((d) => d.needs.includes(n)).length)
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
  const refundNeed = (need) => {
    const i = dayFocus.indexOf(need)
    if (i >= 0) served[i]--
  }

  // Young teams have small drill pools, so avoiding only last practice's drills makes every other
  // practice the same. A drill neither of the last two practices used comes first. When none is
  // left, the repeat comes from whichever of those two practices today shares less with, so today
  // differs from both of them.
  const youngPick = (list) => {
    const newer = list.find((d) => !repeats(d) && !twoBack(d))
    if (newer || !list.length) return newer ?? null
    const fromLast = list.find((d) => repeats(d) && !twoBack(d))
    const fromTwo = list.find((d) => twoBack(d) && !repeats(d))
    const first = sharedLast <= sharedTwo ? fromLast ?? fromTwo : fromTwo ?? fromLast
    return first ?? list[0]
  }

  // Best drill for a need. A drill from last practice is used again only when nothing new fits.
  const bestFor = (need, filter, extra) => {
    const preferred = need ? ranked((d) => filter(d) && d.needs.includes(need) && !overused(d), [need, ...focus], extra) : []
    const general = ranked((d) => filter(d) && !overused(d), focus, extra)
    const any = ranked(filter, focus, extra)
    if (young) return youngPick(preferred) ?? youngPick(general) ?? youngPick(any)
    const fresh = (list) => list.find((d) => !repeats(d))
    return fresh(preferred) ?? fresh(general) ?? fresh(any) ?? preferred[0] ?? general[0] ?? any[0]
  }
  // A must-have pick: the best drill of that kind for today's focus, counted toward the need it serves.
  // Today's focus counts half as much here, so the must-have drill rotates instead of one favorite
  // winning every other practice.
  const mustPick = (must, filter, extra = () => 0) => {
    const list = ranked((d) => filter(d) && must(d), focus, (d) => extra(d) - needScore(d, focus) * 5)
    const d = young ? youngPick(list) : list.find((x) => !repeats(x)) ?? list[0]
    if (d) {
      const i = dayFocus.findIndex((n) => d.needs.includes(n))
      if (i >= 0) served[i]++
    }
    return d ?? null
  }
  const count = (d) => {
    categoryCount[d.category] = (categoryCount[d.category] ?? 0) + 1
  }

  // One round of stations: drills that today's adults can cover, sharing single pieces of gear.
  const stationRound = (n, perStation) => {
    const picks = []
    let roundHit = 0
    let roundPitch = 0
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
      // At most one pitching or catcher drill per round: pitchers and the catcher are the same few
      // players, and a second pitching station would leave them waiting. Allowed only if nothing else fits.
      const spread = (d) => fits(d) && !(roundPitch > 0 && pitchFits(d))
      // The first station goes to the top need; must-haves fill the next ones.
      let d = null
      if (i > 0) for (const must of mustsFor(roundHit, roundPitch)) if (!d) d = mustPick(must, spread, sizeFit)
      if (!d) {
        // Only an open station takes a turn from the needs rotation.
        const need = nextNeed()
        d = bestFor(need, spread, sizeFit) || bestFor(need, fits, sizeFit)
        // A need this round's pitching cap kept out (pitching, catcher) keeps its turn for the next
        // slot, so a pitching team still gets its pitching work later in the practice.
        if (d && need && roundPitch > 0 && !d.needs.includes(need)) refundNeed(need)
      }
      if (!d) break
      if (d.category === 'hitting') roundHit += perStation
      if (pitchFits(d)) roundPitch++
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
      const picks = stationRound(n, perStation)
      if (picks.length >= 2) {
        picks.forEach(count)
        hitMinutes += picks.filter((d) => d.category === 'hitting').length * perStation
        if (picks.some(pitchFits)) pitchNeeded = 0
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
      picks.forEach(giveBack)
    }
    // Prefer a drill that fits the time left over cutting a long drill short.
    const notWarmOrGame = (x) => x.category !== 'warmup' && x.category !== 'game'
    const fitsTime = (x) => left >= blockLength(x, division) * 0.75
    let forced = null
    for (const must of mustsFor()) if (!forced) forced = mustPick(must, (x) => notWarmOrGame(x) && fitsTime(x)) ?? mustPick(must, notWarmOrGame)
    const need = forced ? null : nextNeed()
    const d = forced || bestFor(need, (x) => notWarmOrGame(x) && fitsTime(x)) || bestFor(need, notWarmOrGame)
    if (!d) break
    let m = blockLength(d, division)
    // A hitting block that only tops up today's hitting time is kept short.
    if (forced && d.category === 'hitting' && hitMinutes > 0) m = Math.min(m, Math.max(Math.ceil(m * 0.75), hitTarget - hitMinutes))
    if (m > left) m = left
    if (d.category === 'hitting') hitMinutes += m
    if (pitchFits(d)) pitchNeeded = 0
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
    // Spare minutes go to the last single drill; a plan of only stations gets a short break.
    const lastDrill = [...blocks].reverse().find((b) => b.kind === 'drill' && b !== blocks[0])
    if (lastDrill) lastDrill.minutes += left
    else blocks.push({ id: newId('b'), kind: 'break', minutes: left })
  }

  // Insert water breaks at roughly even spacing, never first or last.
  insertBreaks(blocks, breaks)

  const band = bandFor(division)
  // The talks match what the day is about: a cage day leads with hitting.
  const lead = dayFocus[0] ? needLabel(dayFocus[0]).toLowerCase() : 'the basics'
  blocks.push({ id: newId('b'), kind: 'huddle', minutes: huddle })

  return {
    id: newId('plan'),
    teamId: team.id,
    createdAt: new Date().toISOString(),
    date,
    minutes,
    adults,
    coaches: adults,
    kids,
    coachRole: st.coachRole,
    spaces,
    equipment,
    athletic,
    practiceName: options.practiceName ?? null,
    stationsRequested: options.stations ?? null,
    focus,
    recent: history,
    seed: String(seed),
    opener: pick(OPENERS[band], seed).replace('{need}', lead),
    closer: closerFor(band, dayFocus, String(seed) + 'c'),
    blocks,
  }
}

// The same plan rebuilt for a different number of adults (or anything else), keeping its seed so
// most of the drills stay put. Blocks the coach locked keep their drill, minutes and place, and
// everything else is rebuilt around them.
export function rebuildPlan(team, plan, changes = {}) {
  const opts = {
    minutes: plan.minutes,
    adults: plan.adults ?? plan.coaches,
    kids: plan.kids,
    spaces: plan.spaces,
    equipment: plan.equipment ?? null,
    athletic: plan.athletic,
    practiceName: plan.practiceName,
    stations: plan.stationsRequested ?? undefined,
    focus: plan.focus,
    recent: plan.recent ?? [],
    date: plan.date,
    seed: plan.seed,
    ...changes,
  }
  const locked = plan.blocks.map((b, i) => ({ b, i })).filter((x) => x.b.locked)
  if (!locked.length) {
    const fresh = buildPlan(team, opts)
    return { ...fresh, id: plan.id, createdAt: plan.createdAt }
  }
  const lockedMinutes = locked.reduce((n, x) => n + blockMinutes(x.b), 0)
  const target = opts.minutes ?? 60
  const fresh = buildPlan(team, { ...opts, minutes: Math.max(10, target - lockedMinutes), exclude: locked.flatMap((x) => drillIdsInPlan({ blocks: [x.b] })) })
  return { ...fresh, minutes: target, blocks: mergeLocked(fresh.blocks, locked, target), id: plan.id, createdAt: plan.createdAt }
}

export const hasLocked = (plan) => plan.blocks.some((b) => b.locked)

// Puts locked blocks back at their places among freshly built ones, then evens out the minutes
// using the unlocked drills only.
export function mergeLocked(freshBlocks, locked, target) {
  const isWarm = (b) => b.kind === 'drill' && drillById(b.drillId)?.category === 'warmup'
  const lockedHuddle = locked.find((x) => x.b.kind === 'huddle')
  const lockedWarm = locked.some((x) => isWarm(x.b))
  let body = freshBlocks.filter((b) => b.kind !== 'huddle')
  // One warm-up is enough: a locked one replaces the new one.
  if (lockedWarm) body = body.filter((b) => !isWarm(b))
  const freshHuddle = freshBlocks.find((b) => b.kind === 'huddle')
  const out = [...body]
  for (const { b, i } of [...locked].filter((x) => x.b.kind !== 'huddle').sort((a, c) => a.i - c.i)) out.splice(Math.min(i, out.length), 0, b)
  const huddle = lockedHuddle?.b ?? freshHuddle
  if (huddle) out.push(huddle)
  // Even out to the practice length with the unlocked drill blocks, never below 3 minutes each.
  let diff = target - out.reduce((n, b) => n + blockMinutes(b), 0)
  const free = out.filter((b) => !b.locked && b.kind === 'drill')
  if (diff > 0 && free.length) free[free.length - 1].minutes += diff
  for (let k = free.length - 1; diff < 0 && k >= 0; k--) {
    const take = Math.min(free[k].minutes - 3, -diff)
    if (take > 0) {
      free[k].minutes -= take
      diff += take
    }
  }
  return out
}

/**
 * A plan made from a saved template: the template's blocks and minutes, re-fitted to today's kids
 * and adults (station groups and who runs each station). options are the same as buildPlan's.
 */
export function planFromTemplate(team, template, options = {}) {
  const base = buildPlan(team, {
    ...options,
    minutes: template.minutes ?? options.minutes,
    focus: template.focus?.length ? template.focus : options.focus,
    athletic: template.athletic ?? options.athletic,
  })
  const young = divIndex(team.division) <= divIndex('6U')
  const st = staffingFor({ adults: base.adults })
  const blocks = template.blocks.map((b) => refitBlock({ ...b, id: newId('b') }, base.kids, st, young))
  return { ...base, minutes: template.minutes ?? totalMinutes({ blocks }), blocks, templateId: template.id, templateName: template.name }
}

// Station groups and staff for today's numbers. Too few kids for every station: fewer stations,
// each a little longer, so the block keeps its time.
export function refitBlock(b, kids, st, young) {
  if (b.kind !== 'stations') return b
  const room = Math.max(1, Math.floor(kids / 2))
  let stations = b.stations
  let stationMinutes = b.stationMinutes
  if (stations.length > room) {
    stationMinutes = Math.round((b.stationMinutes * stations.length) / room)
    stations = stations.slice(0, room)
  }
  if (stations.length === 1) return { id: b.id, kind: 'drill', drillId: stations[0], minutes: stationMinutes }
  const drills = stations.map(drillById)
  return {
    ...b,
    stations,
    stationMinutes,
    groups: groupSizes(kids, stations.length),
    staff: drills.every(Boolean) ? assignStaff(drills, st, young) : b.staff,
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

/**
 * The team's plans the planner should look back on for a practice on `date`: the last `max`
 * plans dated before it, within `days` days, most recent first.
 */
export function recentPlans(plans, date, { max = 4, days = 30 } = {}) {
  const from = localDate(new Date(new Date(`${date}T12:00:00`).getTime() - days * 86400000))
  return (plans ?? [])
    .filter((p) => p.date && p.date >= from && p.date < date)
    .sort((a, b) => (a.date === b.date ? ((a.createdAt ?? '') < (b.createdAt ?? '') ? 1 : -1) : a.date < b.date ? 1 : -1))
    .slice(0, max)
}

// ---------------------------------------------------------------- Editing helpers

// A past plan in the short form the planner looks back on: its date, drills and closing game.
// Accepts a full plan or an entry already in that form.
export function historyEntry(p) {
  if (Array.isArray(p.drills)) return { date: p.date ?? null, drills: p.drills, game: p.game ?? null }
  return { date: p.date ?? null, drills: drillIdsInPlan(p), game: closingGameId(p) }
}

// The game that closes a plan: its last drill block, when that drill is a game.
export function closingGameId(plan) {
  const drills = (plan?.blocks ?? []).filter((b) => b.kind === 'drill')
  const last = drills[drills.length - 1]
  return last && drillById(last.drillId)?.category === 'game' ? last.drillId : null
}

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
  const st = staffingFor({ adults: plan.adults ?? plan.coaches ?? 1 })
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

// Drills where players throw real pitches, so pitch counts matter: pitching drills (and live hitting
// against player pitchers) whose own coaching points tell the coach to count. Dry work such as the
// towel drill, pickoff moves and pitchers fielding their position does not count.
const COUNTS_PITCHES = /count (every |each )?(pitch|pitches|throws)|count pitches|pitch limits/i
export function throwsPitches(d) {
  if (!d || !(d.category === 'pitching' || (d.requires ?? []).includes('kidPitch'))) return false
  return COUNTS_PITCHES.test([d.setup, ...(d.steps ?? []), ...(d.points ?? [])].join(' '))
}

export function hasPitching(plan) {
  return drillIdsInPlan(plan).some((id) => throwsPitches(drillById(id)))
}

export const PITCH_NOTE = "Count every pitch. Follow your league's pitch limits and rest days."
// The pitch-count reminder: only for teams whose players pitch, and only when today's plan has pitches.
export const pitchNote = (plan, team) => (team?.rules?.kidPitch && hasPitching(plan) ? PITCH_NOTE : null)

export function fmtClock(totalMin) {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}:${String(m).padStart(2, '0')}`
}
