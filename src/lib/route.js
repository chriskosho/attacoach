import { useEffect, useState } from 'react'

// Hash routes so the phone's back button works: #/today, #/plan/<id>, #/drill/<id> ...
export function parseRoute(hash) {
  const parts = (hash || '').replace(/^#\/?/, '').split('/').filter(Boolean)
  return { name: parts[0] || 'today', id: parts[1] ? decodeURIComponent(parts[1]) : null }
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function go(path) {
  window.location.hash = path.startsWith('#') ? path : `#/${path}`
}

export function back(fallback = 'today') {
  if (window.history.length > 1) window.history.back()
  else go(fallback)
}

// Safe localStorage: it can be missing or throw (private mode, blocked storage).
export const store = {
  get(key, fallback = null) {
    try {
      const v = window.localStorage.getItem(key)
      return v == null ? fallback : JSON.parse(v)
    } catch {
      return fallback
    }
  },
  set(key, value) {
    try {
      if (value == null) window.localStorage.removeItem(key)
      else window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage unavailable */
    }
  },
}
