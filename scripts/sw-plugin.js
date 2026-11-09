import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

// Writes sw.js into the build with the list of built files to precache.
// The version changes with every build, so phones pick up new releases.
export function serviceWorker() {
  let base = '/'
  return {
    name: 'attacoach-service-worker',
    apply: 'build',
    configResolved(config) {
      base = config.base
    },
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'))
      const assets = ['', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', ...files]
        .filter((f, i, all) => all.indexOf(f) === i)
        .map((f) => base + f)
      const version = Date.now().toString(36)
      const template = readFileSync(join(here, 'sw.template.js'), 'utf8')
      const source = template
        .replace('__VERSION__', version)
        .replace('__ASSETS__', JSON.stringify(assets))
        .replace('__BASE__', base)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}
