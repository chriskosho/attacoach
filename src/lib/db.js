import Dexie from 'dexie'

// Everything stays on this device. No accounts, no sync.
export const db = new Dexie('attacoach')

db.version(1).stores({
  teams: 'id, updatedAt',
  plans: 'id, teamId, createdAt',
  settings: 'key',
})

// Version 2: game debriefs and practice recaps.
db.version(2).stores({
  teams: 'id, updatedAt',
  plans: 'id, teamId, createdAt',
  settings: 'key',
  debriefs: 'id, teamId, date',
})

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
  await db.transaction('rw', db.teams, db.plans, db.debriefs, db.settings, async () => {
    await db.plans.where('teamId').equals(id).delete()
    await db.debriefs.where('teamId').equals(id).delete()
    await db.teams.delete(id)
    const next = await db.teams.toCollection().first()
    await setSetting('currentTeamId', next?.id ?? null)
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

export const BACKUP_FORMAT = 'attacoach-backup'

export async function exportBackup() {
  const [teams, plans, debriefs] = await Promise.all([db.teams.toArray(), db.plans.toArray(), db.debriefs.toArray()])
  return { format: BACKUP_FORMAT, version: 2, exportedAt: new Date().toISOString(), teams, plans, debriefs }
}

// Merges a backup into this device. Rows with the same id are replaced.
export async function importBackup(data) {
  if (!data || data.format !== BACKUP_FORMAT || !Array.isArray(data.teams) || !Array.isArray(data.plans)) {
    throw new Error('This file is not an AttaCoach backup.')
  }
  const debriefs = Array.isArray(data.debriefs) ? data.debriefs : []
  await db.transaction('rw', db.teams, db.plans, db.debriefs, db.settings, async () => {
    await db.teams.bulkPut(data.teams)
    await db.plans.bulkPut(data.plans)
    await db.debriefs.bulkPut(debriefs)
    const current = await getSetting('currentTeamId')
    if (!current && data.teams[0]) await setSetting('currentTeamId', data.teams[0].id)
  })
  return { teams: data.teams.length, plans: data.plans.length, debriefs: debriefs.length }
}

export async function clearEverything() {
  await db.transaction('rw', db.teams, db.plans, db.debriefs, db.settings, async () => {
    await Promise.all([db.teams.clear(), db.plans.clear(), db.debriefs.clear(), db.settings.clear()])
  })
}
