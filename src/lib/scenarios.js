import { saveTeam, savePlayers, setSetting, db } from './db.js'
import { teamFromScenario } from './scenarioTeam.js'

/**
 * Saves a ready-made scenario as a new team (coach name, rules, practices, equipment, players) and
 * makes it the current team. The coach's name is set unless `keepCoach` is true and one already exists.
 * Returns the saved team.
 */
export async function loadScenario(sc, { keepCoach = false } = {}) {
  const { team: fields, players } = teamFromScenario(sc)

  const existing = keepCoach ? await db.settings.get('coachName') : null
  if (sc.coach && !existing?.value) await setSetting('coachName', sc.coach)

  const team = await saveTeam(fields)
  await savePlayers(team.id, players.map((p) => ({ ...p, teamId: team.id })))
  return team
}
