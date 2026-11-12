// Drills that teach the same skill the same way. The planner puts at most one drill from each group
// in a practice; a coach can still add or swap in another one by hand.
// Found by comparing every pair of drills in a category that share a need (Stage 9B); pairs that
// build on each other in steps (the fastpitch progression, double play feeds then turns) stay apart.
export const SAME_SKILL = [
  { id: 'receiving', drills: ['catcher-stance', 'catcher-receiving', 'receiving-progression'] },
  { id: 'bullpen', drills: ['bullpen-targets', 'bullpen-intent', 'bullpen-plan', 'fp-corners', 'fp-sim-inning'] },
  { id: 'pitchers-fielding', drills: ['pfp-comebackers', 'fp-pitcher-fields'] },
  { id: 'team-batting-practice', drills: ['live-bp', 'coach-pitch-bp'] },
  { id: 'grounder-to-first', drills: ['field-throw-first', 'cp-coach-grounders'] },
  { id: 'first-fly-balls', drills: ['tennis-flies', 'rainbow-catch'] },
  { id: 'first-tee-swings', drills: ['wiffle-tee', 'swing-and-freeze'] },
  { id: 'dry-swings', drills: ['stance-load-go', 'dry-swings'] },
]

const GROUP_OF = new Map(SAME_SKILL.flatMap((g) => g.drills.map((id) => [id, g.id])))
export const sameSkillGroup = (drillId) => GROUP_OF.get(drillId) ?? null
