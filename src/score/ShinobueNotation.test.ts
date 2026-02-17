import { describe, it, expect } from 'vitest'
import {
  numberToKanji,
  noteToSujiText,
  noteEventToSujiText,
  durationUnderlines,
} from './ShinobueNotation'
import type { NoteEvent, NotePitch } from './ScoreModel'

describe('numberToKanji', () => {
  it('0 → 〇', () => {
    expect(numberToKanji(0)).toBe('〇')
  })

  it('1 → 一', () => {
    expect(numberToKanji(1)).toBe('一')
  })

  it('7 → 七', () => {
    expect(numberToKanji(7)).toBe('七')
  })

  it('範囲外は文字列化', () => {
    expect(numberToKanji(8)).toBe('8')
  })
})

describe('noteToSujiText', () => {
  it('呂音の三 → "三"', () => {
    const pitch: NotePitch = {
      shinobueNumber: 3,
      register: 'ro',
      frequency: 659,
      midiNote: 64,
      western: 'E5',
    }
    expect(noteToSujiText(pitch)).toBe('三')
  })

  it('甲音の一 → "1"', () => {
    const pitch: NotePitch = {
      shinobueNumber: 1,
      register: 'kan',
      frequency: 1109,
      midiNote: 73,
      western: 'C#6',
    }
    expect(noteToSujiText(pitch)).toBe('1')
  })

  it('大甲の二 → "大2"', () => {
    const pitch: NotePitch = {
      shinobueNumber: 2,
      register: 'daikan',
      frequency: 2349,
      midiNote: 86,
      western: 'D7',
    }
    expect(noteToSujiText(pitch)).toBe('大2')
  })

  it('一（呂音）→ "一"', () => {
    const pitch: NotePitch = {
      shinobueNumber: 1,
      register: 'ro',
      frequency: 554,
      midiNote: 61,
      western: 'C#5',
    }
    expect(noteToSujiText(pitch)).toBe('一')
  })
})

describe('noteEventToSujiText', () => {
  it('休符 → "▼"', () => {
    const event: NoteEvent = {
      id: '1',
      type: 'rest',
      duration: { type: 'quarter', dots: 0 },
      startBeat: 0,
    }
    expect(noteEventToSujiText(event)).toBe('▼')
  })

  it('タイ → "～"', () => {
    const event: NoteEvent = {
      id: '3',
      type: 'tie',
      duration: { type: 'quarter', dots: 0 },
      startBeat: 1,
    }
    expect(noteEventToSujiText(event)).toBe('～')
  })

  it('ピッチ付き音符を正しく変換', () => {
    const event: NoteEvent = {
      id: '2',
      type: 'note',
      pitch: {
        shinobueNumber: 5,
        register: 'ro',
        frequency: 784,
        midiNote: 67,
        western: 'G5',
      },
      duration: { type: 'quarter', dots: 0 },
      startBeat: 0,
    }
    expect(noteEventToSujiText(event)).toBe('五')
  })
})

describe('durationUnderlines', () => {
  it('全音符 → 0', () => {
    expect(durationUnderlines('whole')).toBe(0)
  })

  it('四分音符 → 0', () => {
    expect(durationUnderlines('quarter')).toBe(0)
  })

  it('八分音符 → 1', () => {
    expect(durationUnderlines('eighth')).toBe(1)
  })

  it('十六分音符 → 2', () => {
    expect(durationUnderlines('sixteenth')).toBe(2)
  })

  it('三十二分音符 → 3', () => {
    expect(durationUnderlines('thirty-second')).toBe(3)
  })
})
