// Backgrounds for the drill diagrams, drawn from above in a 300 x 300 box. Not to scale.

const stripes = () => {
  let s = '<g class="dg-stripes">'
  for (let i = 0; i < 6; i++) s += `<rect x="${i * 50}" y="0" width="25" height="300"/>`
  return s + '</g>'
}
const base = (x, y) => `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" class="dg-base" transform="rotate(45 ${x} ${y})"/>`

// Full diamond. Home (150,252), 1st (232,172), 2nd (150,92), 3rd (68,172).
const field = () => {
  let s = `<rect width="300" height="300" class="dg-turf"/>${stripes()}`
  s += '<circle cx="150" cy="172" r="98" class="dg-dirt"/><circle cx="150" cy="252" r="26" class="dg-dirt"/>'
  s += '<path d="M150 234 L212 172 L150 110 L88 172Z" class="dg-turf"/><circle cx="150" cy="172" r="7" class="dg-dirt"/>'
  s += '<path d="M150 252 L292 112 M150 252 L8 112" class="dg-line"/>'
  s += base(232, 172) + base(150, 92) + base(68, 172)
  return s + '<polygon points="144,246 156,246 156,252 150,258 144,252" class="dg-base"/>'
}

// Two bases on a dirt strip, close up: 1st at (40,150), 2nd at (260,150).
const basepath = () => {
  let s = `<rect width="300" height="300" class="dg-turf"/>${stripes()}`
  s += '<rect x="14" y="128" width="272" height="44" rx="22" class="dg-dirt"/>'
  s += base(40, 150) + base(260, 150)
  s += '<text x="40" y="190" text-anchor="middle" class="dg-lab">1st</text><text x="260" y="190" text-anchor="middle" class="dg-lab">2nd</text>'
  s += '<text x="150" y="262" text-anchor="middle" class="dg-lab">Next runner</text>'
  return s
}

// Tee station in front of a net or fence. Tee at (150,180).
const cage = () => {
  let s = `<rect width="300" height="300" class="dg-turf"/>${stripes()}`
  s += '<line x1="50" y1="40" x2="250" y2="40" class="dg-net" stroke-width="3"/>'
  for (let x = 50; x <= 250; x += 10) s += `<line x1="${x}" y1="40" x2="${x}" y2="50" class="dg-net"/>`
  s += '<text x="150" y="30" class="dg-lab" text-anchor="middle">Net or fence</text>'
  s += '<rect x="108" y="146" width="84" height="66" rx="4" class="dg-box"/><rect x="146" y="180" width="8" height="8" rx="1" class="dg-tee"/>'
  s += '<circle cx="214" cy="222" r="12" class="dg-spot"/><text x="231" y="226" class="dg-lab">Coach</text>'
  s += '<line x1="16" y1="234" x2="150" y2="234" class="dg-line" stroke-dasharray="6 4"/>'
  s += '<text x="16" y="288" class="dg-lab">Next hitters wait behind the line</text><text x="268" y="76" text-anchor="middle" class="dg-lab">Shaggers</text>'
  return s
}

export const BG = { field: field(), basepath: basepath(), cage: cage() }
