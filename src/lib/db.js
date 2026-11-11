import Dexie from 'dexie'

// Everything stays on this device. No accounts, no sync.
export const db = new Dexie('attacoach')

db.version(1).stores({
  teams: 'id, updatedAt',
  plans: 'id, teamId, createdAt',
  settings: 'key',
})

// Version 3 (below) adds players. Version 2: game debriefs and practice recaps.
db.version(2).stores({
  teams: 'id, updatedAt',
  plans: 'id, teamId, createdAt',
  settings: 'key',
  debriefs: 'id, teamId, date',
})

db.version(3).stores({
  teams: 'id, updatedAt',
  plans: 'id, teamId, createdAt',
  settings: 'key',
  debriefs: 'id, teamId, date',
  players: 'id, teamId',
})

// Version 4: teams carry a sport. Every team made before then is a baseball team.
db.version(4)
  .stores({
    teams: 'id, updatedAt',
    plans: 'id, teamId, createdAt',
    settings: 'key',
    debriefs: 'id, teamId, date',
    players: 'id, teamId',
  })
  .upgrade((tx) =>
    tx
      .table('teams')
      .toCollection()
      .modify((t) => {
        if (!t.sport) t.sport = 'baseball'
      }),
  )

// Version 5: the coach's own drills, and plan templates. Favorite and hidden drills live on each
// team (team.favorites, team.hidden).
db.version(5).stores({
  teams: 'id, updatedAt',
  plans: 'id, teamId, createdAt',
  settings: 'key',
  debriefs: 'id, teamId, date',
  players: 'id, teamId',
  customDrills: 'id, updatedAt',
  templates: 'id, teamId',
})

// Teams from older backups or installs have no sport: they are baseball teams.
export const withSport = (t) => (t.sport ? t : { ...t, sport: 'baseball' })

export async function getSetting(key, fallback = null) {
  const row = await db.settings.get(key)
  return row ? row.value : fallback
}

export function setSetting(key, value) {
  return db.settings.put({ key, value })
}

const newId = () => `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export async function saveTeam(team) {
  const row = { ...team, id: team.id ?? newId(), updatedAt: new Date().toISOString() }
  await db.teams.put(row)
  await setSetting('currentTeamId', row.id)
  return row
}

export async function deleteTeam(id) {
  await db.transaction('rw', db.teams, db.plans, db.debriefs, db.players, db.settings, db.templates, async () => {
    await db.templates.where('teamId').equals(id).delete()
    await db.players.where('teamId').equals(id).delete()
    await db.plans.where('teamId').equals(id).delete()
    await db.debriefs.where('teamId').equals(id).delete()
    await db.teams.delete(id)
    const next = await db.teams.toCollection().first()
    await setSetting('currentTeamId', next?.id ?? null)
  })
}

// Makes the stored roster for a team match `players` exactly: adds, updates and removes.
export async function savePlayers(teamId, players) {
  await db.transaction('rw', db.players, async () => {
    const keep = new Set(players.map((p) => p.id))
    const old = await db.players.where('teamId').equals(teamId).primaryKeys()
    await db.players.bulkDelete(old.filter((id) => !keep.has(id)))
    await db.players.bulkPut(players.map((p) => ({ ...p, teamId })))
  })
}

export function savePlan(plan) {
  return db.plans.put({ ...plan, updatedAt: new Date().toISOString() })
}

const newDebriefId = () => `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export async function saveDebrief(entry) {
  const now = new Date().toISOString()
  const row = { ...entry, id: entry.id ?? newDebriefId(), createdAt: entry.createdAt ?? now, updatedAt: now }
  await db.debriefs.put(row)
  return row
}

export function deleteDebrief(id) {
  return db.debriefs.delete(id)
}

// ---------------------------------------------------------------- Favorites, hidden drills, own drills, templates

// Adds or removes a drill id from one of a team's lists ('favorites' or 'hidden').
export async function toggleTeamList(teamId, list, drillId) {
  const t = await db.teams.get(teamId)
  if (!t) return false
  const cur = t[list] ?? []
  const on = !cur.includes(drillId)
  const next = on ? [...cur, drillId] : cur.filter((x) => x !== drillId)
  // Favorite and hidden don't mix: marking one clears the other.
  const other = list === 'favorites' ? 'hidden' : 'favorites'
  const patch = { [list]: next }
  if (on && (t[other] ?? []).includes(drillId)) patch[other] = t[other].filter((x) => x !== drillId)
  await db.teams.update(teamId, patch)
  return on
}

const newCustomId = () => `my-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

export async function saveCustomDrill(row) {
  const now = new Date().toISOString()
  const saved = { ...row, id: row.id ?? newCustomId(), createdAt: row.createdAt ?? now, updatedAt: now, deleted: false }
  await db.customDrills.put(saved)
  return saved
}

// Kept as a "deleted drill" so saved plans that use it still show its name.
export async function deleteCustomDrill(id) {
  await db.customDrills.update(id, { deleted: true, updatedAt: new Date().toISOString() })
}

const newTemplateId = () => `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

export async function saveTemplate(plan, name) {
  const row = {
    id: newTemplateId(),
    teamId: plan.teamId,
    name: name.trim(),
    createdAt: new Date().toISOString(),
    minutes: plan.minutes,
    focus: plan.focus ?? [],
    spaces: plan.spaces ?? ['field'],
    athletic: !!plan.athletic,
    blocks: plan.blocks.map(({ locked, ...b }) => b),
  }
  await db.templates.put(row)
  return row
}

export const deleteTemplate = (id) => db.templates.delete(id)

export const BACKUP_FORMAT = 'attacoach-backup'

export async function exportBackup() {
  const [teams, plans, debriefs, players, customDrills, templates, coachName] = await Promise.all([
    db.teams.toArray(),
    db.plans.toArray(),
    db.debriefs.toArray(),
    db.players.toArray(),
    db.customDrills.toArray(),
    db.templates.toArray(),
    getSetting('coachName', ''),
  ])
  return { format: BACKUP_FORMAT, version: 5, exportedAt: new Date().toISOString(), coachName, teams, plans, debriefs, players, customDrills, templates }
}

/**
 * What a backup file holds, for showing before a restore: counts, team names, the span of plan
 * dates, when it was saved, and how much of it is already on this device (those rows get replaced).
 */
export async function describeBackup(data) {
  if (!data || data.format !== BACKUP_FORMAT || !Array.isArray(data.teams) || !Array.isArray(data.plans)) {
    throw new Error('This file is not an AttaCoach backup.')
  }
  const players = Array.isArray(data.players) ? data.players : []
  const debriefs = Array.isArray(data.debriefs) ? data.debriefs : []
  const dates = data.plans.map((p) => p.date ?? (p.createdAt ?? '').slice(0, 10)).filter(Boolean).sort()
  const [teamsHere, plansHere] = await Promise.all([db.teams.bulkGet(data.teams.map((t) => t.id)), db.plans.bulkGet(data.plans.map((p) => p.id))])
  return {
    teams: data.teams.length,
    teamNames: data.teams.map((t) => t.name).filter(Boolean),
    players: players.length,
    plans: data.plans.length,
    debriefs: debriefs.length,
    customDrills: (Array.isArray(data.customDrills) ? data.customDrills : []).filter((d) => !d.deleted).length,
    templates: Array.isArray(data.templates) ? data.templates.length : 0,
    firstDate: dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
    exportedAt: data.exportedAt ?? null,
    replacesTeams: teamsHere.filter(Boolean).length,
    replacesPlans: plansHere.filter(Boolean).length,
  }
}

// Merges a backup into this device. Rows with the same id are replaced.
export async function importBackup(data) {
  if (!data || data.format !== BACKUP_FORMAT || !Array.isArray(data.teams) || !Array.isArray(data.plans)) {
    throw new Error('This file is not an AttaCoach backup.')
  }
  const debriefs = Array.isArray(data.debriefs) ? data.debriefs : []
  const players = Array.isArray(data.players) ? data.players : []
  // Version 5 and later: the coach's own drills and templates. Older backups have neither.
  const customDrills = Array.isArray(data.customDrills) ? data.customDrills : []
  const templates = Array.isArray(data.templates) ? data.templates : []
  await db.transaction('rw', [db.teams, db.plans, db.debriefs, db.players, db.settings, db.customDrills, db.templates], async () => {
    await db.customDrills.bulkPut(customDrills)
    await db.templates.bulkPut(templates)
    await db.players.bulkPut(players)
    await db.teams.bulkPut(data.teams.map(withSport))
    await db.plans.bulkPut(data.plans)
    await db.debriefs.bulkPut(debriefs)
    const current = await getSetting('currentTeamId')
    if (!current && data.teams[0]) await setSetting('currentTeamId', data.teams[0].id)
    if (typeof data.coachName === 'string' && data.coachName.trim() && !(await getSetting('coachName'))) await setSetting('coachName', data.coachName.trim())
  })
  return { teams: data.teams.length, plans: data.plans.length, debriefs: debriefs.length, players: players.length, customDrills: customDrills.length, templates: templates.length }
}

export async function clearEverything() {
  await db.transaction('rw', [db.teams, db.plans, db.debriefs, db.players, db.settings, db.customDrills, db.templates], async () => {
    await Promise.all([db.teams.clear(), db.plans.clear(), db.debriefs.clear(), db.players.clear(), db.settings.clear(), db.customDrills.clear(), db.templates.clear()])
  })
}
