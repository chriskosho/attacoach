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

export function defaultRules(division) {
  const d = divIndex(division)
  return Object.fromEntries(RULES.map((r) => [r.id, d >= divIndex(r.fromDivision)]))
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
