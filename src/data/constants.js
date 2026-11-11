// Core vocabulary shared by the drill library, setup and plan engine.

export const DIVISIONS = ['4U', '6U', '8U', '10U', '12U', '14U']

export const divIndex = (div) => DIVISIONS.indexOf(div)

// Game rules. Defaults follow the standard (non-Little League) game:
// dropped third strike, leading off and stealing start at 10U.
export const RULES = [
  {
    id: 'kidPitch',
    label: 'Players pitch',
    help: 'Kids pitch to each other (instead of tee, coach or machine pitch).',
    fromDivision: '10U',
  },
  {
    id: 'stealing',
    label: 'Stealing',
    help: 'Runners may steal bases.',
    fromDivision: '10U',
  },
  {
    id: 'leadoff',
    label: 'Leading off',
    help: 'Runners may lead off before the pitch.',
    fromDivision: '10U',
  },
  {
    id: 'droppedThird',
    label: 'Dropped third strike',
    help: 'The batter may run to first when the catcher does not catch strike three.',
    fromDivision: '10U',
  },
]

// Softball teams: players pitch in fastpitch at any age, and never in coach pitch or tee ball.
export function defaultRules(division, sport = 'baseball', format = null) {
  const d = divIndex(division)
  const rules = Object.fromEntries(RULES.map((r) => [r.id, d >= divIndex(r.fromDivision)]))
  if (sport === 'softball' && format) rules.kidPitch = format === 'fastpitch'
  return rules
}

export const EXPERIENCE = [
  { id: 'new', label: 'New to coaching', help: 'First season, or first time running practice.' },
  { id: 'some', label: 'A few seasons', help: 'Comfortable running drills; still building a playbook.' },
  { id: 'experienced', label: 'Experienced', help: 'Many seasons; wants harder drills and short notes.' },
]

export const LEVELS = [
  { id: 'beginner', label: 'Beginner', short: 'B' },
  { id: 'intermediate', label: 'Intermediate', short: 'I' },
  { id: 'advanced', label: 'Advanced', short: 'A' },
]

export const levelIndex = (level) => LEVELS.findIndex((l) => l.id === level)

// Highest drill difficulty each coach experience level is offered by default.
export const MAX_LEVEL_FOR = { new: 'beginner', some: 'intermediate', experienced: 'advanced' }

// Developmental needs: what the team most needs to get better at.
export const NEEDS = [
  { id: 'catching', label: 'Catching the ball', help: 'Glove work, two hands, not flinching.' },
  { id: 'throwing', label: 'Throwing accuracy', help: 'Grip, footwork and hitting the target.' },
  { id: 'grounders', label: 'Fielding ground balls', help: 'Ready position, glove down, getting in front.' },
  { id: 'flyballs', label: 'Catching fly balls', help: 'Reading the ball, drop step, calling it.' },
  { id: 'contact', label: 'Making contact', help: 'Stance, swing path, seeing the ball.' },
  { id: 'approach', label: 'At-bat approach', help: 'Strike zone, two-strike hitting, confidence.' },
  { id: 'bunting', label: 'Bunting', help: 'Sacrifice and placement.' },
  { id: 'baserunning', label: 'Base running', help: 'Running through first, rounding, leads and steals.' },
  { id: 'awareness', label: 'Knowing where to throw', help: 'Game situations, outs, cutoffs and backups.' },
  { id: 'pitching', label: 'Pitching', help: 'Mechanics, throwing strikes, holding runners.' },
  { id: 'catcher', label: 'Catcher skills', help: 'Receiving, blocking, throwing out runners.' },
  { id: 'athleticism', label: 'Speed and agility', help: 'Footwork, quickness and coordination.' },
]

export const needLabel = (id) => NEEDS.find((n) => n.id === id)?.label ?? id

export const CATEGORIES = [
  { id: 'warmup', label: 'Warm-up' },
  { id: 'throwing', label: 'Throwing and catching' },
  { id: 'infield', label: 'Infield' },
  { id: 'outfield', label: 'Outfield' },
  { id: 'hitting', label: 'Hitting' },
  { id: 'baserunning', label: 'Base running' },
  { id: 'pitching', label: 'Pitching' },
  { id: 'catcher', label: 'Catching position' },
  { id: 'team', label: 'Team defense' },
  { id: 'game', label: 'Games and competition' },
]

export const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label ?? id

// Longest single drill block that holds attention at each age (minutes).
export const MAX_BLOCK = { '4U': 8, '6U': 10, '8U': 12, '10U': 15, '12U': 20, '14U': 20 }

export const PRACTICE_LENGTHS = [45, 60, 75, 90, 105, 120]

// Longest practice that makes sense at each age (minutes).
export const MAX_PRACTICE = { '4U': 60, '6U': 75, '8U': 90, '10U': 120, '12U': 120, '14U': 120 }

export const lengthsFor = (division) => PRACTICE_LENGTHS.filter((m) => m <= (MAX_PRACTICE[division] ?? 120))

// Needs that have at least one drill at this division (pitching makes no sense at 4U).
export function needsForDivision(division, drills) {
  const d = divIndex(division)
  return NEEDS.filter((n) =>
    drills.some((x) => x.needs.includes(n.id) && d >= divIndex(x.ages[0]) && d <= divIndex(x.ages[1])),
  )
}

// "A, B, C" or "A, B, C and 2 more" for a ranked list of need ids.
export function focusSummary(ids = [], max = 3) {
  if (!ids.length) return 'general'
  const shown = ids.slice(0, max).map(needLabel).join(', ')
  return ids.length > max ? `${shown} and ${ids.length - max} more` : shown
}

// How the app addresses the coach: "Coach Chris". Typing "Coach Chris" does not double up.
export function coachTitle(name) {
  const n = (name ?? '').trim().replace(/\s+/g, ' ')
  if (!n) return ''
  return /^coach\b/i.test(n) ? n : `Coach ${n}`
}

export function greeting(name, now = new Date()) {
  const h = now.getHours()
  const hello = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const who = coachTitle(name)
  return who ? `${hello}, ${who}` : hello
}

// ---------------------------------------------------------------- Players

// Overall rating for a player. Coaches only; quick to tap.
export const PLAYER_RATINGS = [
  { id: 'novice', label: 'Novice' },
  { id: 'developing', label: 'Developing' },
  { id: 'solid', label: 'Solid' },
  { id: 'strong', label: 'Strong' },
]

export const POSITIONS = [
  { id: 'P', label: 'Pitcher', short: 'P' },
  { id: 'C', label: 'Catcher', short: 'C' },
  { id: '1B', label: 'First base', short: '1B' },
  { id: '2B', label: 'Second base', short: '2B' },
  { id: '3B', label: 'Third base', short: '3B' },
  { id: 'SS', label: 'Shortstop', short: 'SS' },
  { id: 'LF', label: 'Left field', short: 'LF' },
  { id: 'CF', label: 'Center field', short: 'CF' },
  { id: 'RF', label: 'Right field', short: 'RF' },
]

export const positionShort = (id) => POSITIONS.find((p) => p.id === id)?.short ?? id

// What a team without chosen skills works on: the basics for the age group.
export function starterNeeds(division) {
  return divIndex(division) <= divIndex('6U') ? ['catching', 'throwing', 'contact'] : ['catching', 'throwing', 'grounders', 'contact']
}

export const PLAYED = [
  { id: 'yes', label: 'Yes, quite a bit' },
  { id: 'some', label: 'A little' },
  { id: 'no', label: 'Not really' },
]

// ---------------------------------------------------------------- Where and with what

export const SPACES = [
  { id: 'field', label: 'Full field', help: 'Bases, dirt and an outfield' },
  { id: 'cage', label: 'Batting cage', help: 'Netted hitting tunnel' },
  { id: 'open', label: 'Open grass', help: 'A grassy or open area for catch and fly balls' },
  { id: 'gym', label: 'Gym or indoors', help: 'Soft balls, footwork and walk-throughs' },
]

// Generic names on purpose. Missing gear only nudges drill choice; it never blocks a plan.
export const EQUIPMENT = [
  { id: 'tee', label: 'Batting tees' },
  { id: 'machine', label: 'Pitching machine' },
  { id: 'selfTrainer', label: 'Self-run hitting trainer' },
  { id: 'assistTrainer', label: 'Assisted hitting trainer' },
  { id: 'net', label: 'Pitching net or strike target' },
  { id: 'rebound', label: 'Rebound net' },
  { id: 'lscreen', label: 'L-screen' },
  { id: 'catcherGear', label: "Catcher's gear" },
  { id: 'cones', label: 'Cones or agility ladder' },
  { id: 'softBalls', label: 'Foam or practice balls' },
]

// Only one station at a time can use these (most teams have one).
export const SINGLE_GEAR = ['machine', 'selfTrainer', 'assistTrainer', 'lscreen', 'net']

export const spaceLabel = (id) => SPACES.find((s) => s.id === id)?.label ?? id
export const gearLabel = (id) => EQUIPMENT.find((g) => g.id === id)?.label ?? id

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// The plan a team gets when it has not described how it practices.
export const DEFAULT_PRACTICE = { id: 'default', name: 'Field practice', day: null, minutes: 60, spaces: ['field'] }

// Athletic warm-up starts on for older teams, where it pays off most. Coaches can switch it any time.
export const athleticDefault = (division) => divIndex(division) >= divIndex('10U')
