import { describe, it, expect } from 'vitest'
import {
  frequencyToMidiNote,
  midiNoteToFrequency,
  midiNoteToName,
  frequencyToNoteName,
  frequencyCentOffset,
  centsBetween,
} from './frequency'

describe('frequencyToMidiNote', () => {
  it('A4 (440Hz) → MIDI 69', () => {
    expect(frequencyToMidiNote(440)).toBeCloseTo(69, 5)
  })

  it('A5 (880Hz) → MIDI 81', () => {
    expect(frequencyToMidiNote(880)).toBeCloseTo(81, 5)
  })

  it('C4 (261.63Hz) → MIDI 60', () => {
    expect(frequencyToMidiNote(261.63)).toBeCloseTo(60, 0)
  })

  it('カスタムチューニング A4=442Hz', () => {
    expect(frequencyToMidiNote(442, 442)).toBeCloseTo(69, 5)
  })
})

describe('midiNoteToFrequency', () => {
  it('MIDI 69 → 440Hz', () => {
    expect(midiNoteToFrequency(69)).toBeCloseTo(440, 2)
  })

  it('MIDI 60 → 261.63Hz', () => {
    expect(midiNoteToFrequency(60)).toBeCloseTo(261.63, 1)
  })

  it('MIDI 81 → 880Hz', () => {
    expect(midiNoteToFrequency(81)).toBeCloseTo(880, 2)
  })
})

describe('midiNoteToName', () => {
  it('MIDI 69 → A4', () => {
    expect(midiNoteToName(69)).toBe('A4')
  })

  it('MIDI 60 → C4', () => {
    expect(midiNoteToName(60)).toBe('C4')
  })

  it('MIDI 72 → C5', () => {
    expect(midiNoteToName(72)).toBe('C5')
  })

  it('MIDI 61 → C#4', () => {
    expect(midiNoteToName(61)).toBe('C#4')
  })
})

describe('frequencyToNoteName', () => {
  it('440Hz → A4', () => {
    expect(frequencyToNoteName(440)).toBe('A4')
  })

  it('880Hz → A5', () => {
    expect(frequencyToNoteName(880)).toBe('A5')
  })

  it('523.25Hz → C5', () => {
    expect(frequencyToNoteName(523.25)).toBe('C5')
  })
})

describe('frequencyCentOffset', () => {
  it('ちょうど A4 → 0 cents', () => {
    expect(frequencyCentOffset(440)).toBeCloseTo(0, 1)
  })

  it('A4 より少し高い → 正のセント値', () => {
    const offset = frequencyCentOffset(445)
    expect(offset).toBeGreaterThan(0)
    expect(offset).toBeLessThan(50)
  })

  it('A4 より少し低い → 負のセント値', () => {
    const offset = frequencyCentOffset(435)
    expect(offset).toBeLessThan(0)
    expect(offset).toBeGreaterThan(-50)
  })
})

describe('centsBetween', () => {
  it('1オクターブ = 1200 cents', () => {
    expect(centsBetween(880, 440)).toBeCloseTo(1200, 1)
  })

  it('同じ周波数 = 0 cents', () => {
    expect(centsBetween(440, 440)).toBeCloseTo(0, 5)
  })

  it('半音 = 100 cents', () => {
    const f1 = 440
    const f2 = 440 * Math.pow(2, 1 / 12)
    expect(centsBetween(f2, f1)).toBeCloseTo(100, 1)
  })
})
