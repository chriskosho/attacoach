// Backgrounds for the drill diagrams, drawn from above in a 300 x 300 box. Colors come from CSS
// variables so they follow light and dark mode.

const stripes = (h) => {
  let s = '<g class="dg-stripes">'
  for (let i = 0; i < 6; i++) s += `<rect x="${i * 50}" y="0" width="25" height="${h}"/>`
  return s + '</g>'
}

const field = () => {
  let s = `<rect width="300" height="300" class="dg-turf"/>${stripes(300)}`
  s += '<circle cx="150" cy="172" r="98" class="dg-dirt"/><circle cx="150" cy="252" r="26" class="dg-dirt"/>'
  s += '<path d="M150 234 L212 172 L150 110 L88 172Z" class="dg-turf"/><circle cx="150" cy="172" r="7" class="dg-dirt"/>'
  s += '<path d="M150 252 L292 112 M150 252 L8 112" class="dg-line"/>'
  for (const [x, y] of [[232, 172], [150, 92], [68, 172]]) s += `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" class="dg-base" transform="rotate(45 ${x} ${y})"/>`
  return s + '<polygon points="144,246 156,246 156,252 150,258 144,252" class="dg-base"/>'
}

const cage = () => {
  let s = `<rect width="300" height="300" class="dg-turf"/>${stripes(300)}`
  s += '<line x1="50" y1="34" x2="250" y2="34" class="dg-net" stroke-width="3"/>'
  for (let x = 50; x <= 250; x += 10) s += `<line x1="${x}" y1="34" x2="${x}" y2="44" class="dg-net"/>`
  s += '<text x="150" y="26" class="dg-lab" text-anchor="middle">Net or fence</text>'
  s += '<rect x="112" y="140" width="76" height="66" rx="4" class="dg-box"/><rect x="147" y="176" width="6" height="9" class="dg-tee"/>'
  s += '<line x1="20" y1="226" x2="150" y2="226" class="dg-line" stroke-dasharray="6 4"/>'
  s += '<text x="20" y="288" class="dg-lab">Next hitters wait behind the line</text><text x="214" y="112" class="dg-lab">Shaggers</text>'
  return s
}

export const BG = { field: field(), cage: cage() }
