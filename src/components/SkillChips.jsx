// Multi-select chips with no limit on how many can be chosen.
export default function SkillChips({ options, value, onChange, label }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" className="chip" aria-pressed={value.includes(o.id)} title={o.help} onClick={() => toggle(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
