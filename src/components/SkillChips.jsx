// Multi-select chips with no limit on how many can be chosen.
// `disabled` lists ids that cannot be picked here (greyed out), with `disabledNote` as their hint.
export default function SkillChips({ options, value, onChange, label, disabled = [], disabledNote = '' }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => {
        const off = disabled.includes(o.id) && !value.includes(o.id)
        return (
          <button key={o.id} type="button" className="chip" aria-pressed={value.includes(o.id)} disabled={off} title={off ? disabledNote : o.help} onClick={() => toggle(o.id)}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
