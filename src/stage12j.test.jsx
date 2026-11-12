// Stage 12J: plans never name a person for a station. The coach decides who takes what.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { VERSION, CHANGELOG } from './changelog.js'
import { staffText, staffTag } from './lib/practices.js'
import { staffShort } from './lib/share.js'

describe('12J no one is assigned to a station', () => {
  it('run stations only say they need an adult', () => {
    expect(staffText({ type: 'run' })).toBe('Needs an adult to run it.')
    expect(staffTag({ type: 'run' })).toBe('Needs an adult')
    expect(staffShort({ type: 'run' })).toBe('needs an adult')
  })
  it('older saved plans that named people read neutrally', () => {
    for (const who of ['coach', 'helper']) {
      expect(staffText({ type: 'run', who, helper: 1 })).not.toMatch(/you|helper|coach/i)
      expect(staffTag({ type: 'run', who, helper: 1 })).toBe('Needs an adult')
    }
  })
  it('no source file shows "You run" or "Helper N" wording', () => {
    for (const f of ['src/lib/practices.js', 'src/lib/share.js', 'src/components/RunTimer.jsx', 'src/components/PlanView.jsx']) {
      expect(fs.readFileSync(f, 'utf8')).not.toMatch(/You run (it|this)|Helper \$\{|head coach/)
    }
  })
  it('is released as 1.40.0 with a changelog entry', () => {
    expect(VERSION).toBe('1.40.0')
    expect(CHANGELOG[0].version).toBe('1.40.0')
  })
})
