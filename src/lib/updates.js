// Service worker registration and "new version ready" signal.
const listeners = new Set()
let waiting = null

export function onUpdateReady(fn) {
  listeners.add(fn)
  if (waiting) fn()
  return () => listeners.delete(fn)
}

function announce(worker) {
  waiting = worker
  listeners.forEach((fn) => fn())
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return
  const base = import.meta.env.BASE_URL
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${base}sw.js`, { scope: base })
      .then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) announce(reg.waiting)
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) announce(worker)
          })
        })
        // Check for a new version when the app comes back to the foreground.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {})
        })
      })
      .catch(() => {})
    // Reload only when a new version replaces a running one, not on the very first install.
    const hadController = !!navigator.serviceWorker.controller
    let reloaded = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded || !hadController) return
      reloaded = true
      window.location.reload()
    })
  })
}

export function applyUpdate() {
  if (waiting) waiting.postMessage('skip-waiting')
  else window.location.reload()
}
