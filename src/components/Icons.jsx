const paths = {
  // Today: home plate
  today: <path d="M5 4h14v9l-7 7-7-7z" />,
  // Plans: clipboard
  plans: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" />
    </>
  ),
  // Drills: ball with seams
  drills: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M7.5 5.2c2 2 2 11.6 0 13.6M16.5 5.2c-2 2-2 11.6 0 13.6" />
    </>
  ),
  // Log: notebook with a pencil line
  log: (
    <>
      <path d="M6 3.5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6z" />
      <path d="M6 3.5v17M10 8h5M10 12h5M10 16h3" />
    </>
  ),
  // Team: cap
  team: (
    <>
      <path d="M4 15c0-5 3.5-8.5 8-8.5s8 3.5 8 8.5z" />
      <path d="M12 15h9" />
    </>
  ),
}

export function TabIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}
