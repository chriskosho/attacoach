// A small minus / number / plus control. Any value in range is fine; nothing is forced.
export default function Stepper({ label, value, onChange, min = 1, max = 30 }) {
  const set = (v) => onChange(Math.max(min, Math.min(max, v)))
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label={`Fewer: ${label}`} disabled={value <= min} onClick={() => set(value - 1)}>
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label={`More: ${label}`} disabled={value >= max} onClick={() => set(value + 1)}>
        +
      </button>
    </div>
  )
}
