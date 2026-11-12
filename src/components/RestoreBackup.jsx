import { useRef, useState } from 'react'
import { importBackup, describeBackup } from '../lib/db.js'
import { plural } from '../lib/backupFile.js'
import Sheet from './Sheet.jsx'

const niceDate = (iso) => (iso ? new Date(iso.length > 10 ? iso : `${iso}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '')
const BAD_FILE = 'That file could not be read. Choose an AttaCoach backup (.json).'

// A button that lets the coach pick a backup file, shows what is in it, and adds it on a yes.
// Used on the first screen and in Settings. `onMessage` gets a plain-language result line.
export default function RestoreBackup({ label = 'Restore', className = 'btn quiet', onMessage = () => {} }) {
  const fileRef = useRef(null)
  const [pending, setPending] = useState(null)

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      setPending({ data, info: await describeBackup(data) })
    } catch (err) {
      onMessage(err.message?.includes('AttaCoach') ? err.message : BAD_FILE)
    }
  }

  const confirm = async () => {
    const { data } = pending
    setPending(null)
    try {
      const r = await importBackup(data)
      onMessage(`Restored ${plural(r.teams, 'team')} and ${plural(r.plans, 'plan')}${r.debriefs ? ` and ${plural(r.debriefs, 'log entry', 'log entries')}` : ''}.`)
    } catch (err) {
      onMessage(err.message?.includes('AttaCoach') ? err.message : BAD_FILE)
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => fileRef.current?.click()}>
        {label}
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden aria-label="Backup file" onChange={pick} />
      {pending && <RestoreSheet info={pending.info} onYes={confirm} onClose={() => setPending(null)} />}
    </>
  )
}

// What a backup holds, shown before it is added to this device.
export function RestoreSheet({ info, onYes, onClose }) {
  const extras = []
  if (info.customDrills) extras.push(plural(info.customDrills, 'drill of your own', 'drills of your own'))
  if (info.templates) extras.push(plural(info.templates, 'template'))
  if (info.favorites) extras.push(plural(info.favorites, 'favorite drill'))
  if (info.hidden) extras.push(plural(info.hidden, 'hidden drill'))
  return (
    <Sheet title="Restore this backup?" onClose={onClose}>
      <ul className="restore-list">
        <li>
          <strong>{plural(info.teams, 'team')}</strong>
          {info.teamNames.length > 0 && `: ${info.teamNames.join(', ')}`}
        </li>
        <li>{plural(info.players, 'player')}</li>
        <li>
          {plural(info.plans, 'plan')}
          {info.firstDate && (info.firstDate === info.lastDate ? ` (${niceDate(info.firstDate)})` : ` (${niceDate(info.firstDate)} to ${niceDate(info.lastDate)})`)}
        </li>
        <li>{plural(info.debriefs, 'log entry', 'log entries')}</li>
        {extras.map((x) => (
          <li key={x}>{x}</li>
        ))}
        {info.exportedAt && <li>Saved {niceDate(info.exportedAt)}</li>}
      </ul>
      <p className="small muted">
        Restoring adds these to what is on this device. {info.replacesTeams + info.replacesPlans > 0 ? `${plural(info.replacesTeams, 'team')} and ${plural(info.replacesPlans, 'plan')} here already match the backup and will be replaced by its version.` : 'Nothing on this device is replaced.'} Other teams and plans stay.
      </p>
      <div className="action-row">
        <button className="btn" onClick={onYes}>
          Restore
        </button>
        <button className="btn quiet" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Sheet>
  )
}
