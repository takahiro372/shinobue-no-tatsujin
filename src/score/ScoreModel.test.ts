import { describe, it, expect, beforeEach } from 'vitest'
import {
  durationToBeats,
  beatsPerMeasure,
  createEmptyScore,
  addNoteToMeasure,
  removeNoteFromMeasure,
  updateMeasure,
  appendMeasure,
  removeMeasure,
  totalBeats,
  totalDurationSeconds,
  createNoteEvent,
  resetNoteIdCounter,
} from './ScoreModel'
import type { Measure } from './ScoreModel'

beforeEach(() => {
  resetNoteIdCounter()
})

describe('durationToBeats', () => {
  it('全音符 = 4拍', () => {
    expect(durationToBeats({ type: 'whole', dots: 0 })).toBe(4)
  })

  it('二分音符 = 2拍', () => {
    expect(durationToBeats({ type: 'half', dots: 0 })).toBe(2)
  })

  it('四分音符 = 1拍', () => {
    expect(durationToBeats({ type: 'quarter', dots: 0 })).toBe(1)
  })

  it('八分音符 = 0.5拍', () => {
    expect(durationToBeats({ type: 'eighth', dots: 0 })).toBe(0.5)
  })

  it('十六分音符 = 0.25拍', () => {
    expect(durationToBeats({ type: 'sixteenth', dots: 0 })).toBe(0.25)
  })

  it('付点四分音符 = 1.5拍', () => {
    expect(durationToBeats({ type: 'quarter', dots: 1 })).toBe(1.5)
  })

  it('付点二分音符 = 3拍', () => {
    expect(durationToBeats({ type: 'half', dots: 1 })).toBe(3)
  })

  it('複付点四分音符 = 1.75拍', () => {
    expect(durationToBeats({ type: 'quarter', dots: 2 })).toBe(1.75)
  })

  it('三連符の八分音符 = 1/3拍', () => {
    expect(durationToBeats({ type: 'eighth', dots: 0, tuplet: 3 })).toBeCloseTo(1 / 3, 5)
  })
})

describe('beatsPerMeasure', () => {
  it('4/4拍子 = 4拍', () => {
    expect(beatsPerMeasure([4, 4])).toBe(4)
  })

  it('3/4拍子 = 3拍', () => {
    expect(beatsPerMeasure([3, 4])).toBe(3)
  })

  it('6/8拍子 = 3拍', () => {
    expect(beatsPerMeasure([6, 8])).toBe(3)
  })

  it('2/4拍子 = 2拍', () => {
    expect(beatsPerMeasure([2, 4])).toBe(2)
  })

  it('2/2拍子 = 4拍', () => {
    expect(beatsPerMeasure([2, 2])).toBe(4)
  })
})

describe('createEmptyScore', () => {
  it('デフォルト値で楽譜を作成', () => {
    const score = createEmptyScore()
    expect(score.metadata.title).toBe('無題')
    expect(score.metadata.tempo).toBe(80)
    expect(score.metadata.timeSignature).toEqual([4, 4])
    expect(score.metadata.shinobueKey).toBe('nana')
    expect(score.measures).toHaveLength(4)
  })

  it('カスタム設定で作成', () => {
    const score = createEmptyScore({
      title: 'さくらさくら',
      composer: '日本古謡',
      tempo: 72,
      timeSignature: [3, 4],
      measureCount: 8,
    })
    expect(score.metadata.title).toBe('さくらさくら')
    expect(score.metadata.composer).toBe('日本古謡')
    expect(score.measures).toHaveLength(8)
    expect(score.metadata.timeSignature).toEqual([3, 4])
  })

  it('各小節に全休符が入っている', () => {
    const score = createEmptyScore()
    for (const measure of score.measures) {
      expect(measure.notes).toHaveLength(1)
      expect(measure.notes[0]!.type).toBe('rest')
    }
  })

  it('最後の小節が final barline', () => {
    const score = createEmptyScore({ measureCount: 4 })
    expect(score.measures[3]!.barline).toBe('final')
    expect(score.measures[0]!.barline).toBe('normal')
  })
})

describe('addNoteToMeasure', () => {
  it('小節に音符を追加する', () => {
    const measure: Measure = { number: 1, notes: [] }
    const note = createNoteEvent({ startBeat: 0 })
    const result = addNoteToMeasure(measure, note)
    expect(result.notes).toHaveLength(1)
    expect(result.notes[0]!.startBeat).toBe(0)
  })

  it('追加後に startBeat 順でソートされる', () => {
    let measure: Measure = { number: 1, notes: [] }
    const n1 = createNoteEvent({ startBeat: 2 })
    const n2 = createNoteEvent({ startBeat: 0 })
    const n3 = createNoteEvent({ startBeat: 1 })
    measure = addNoteToMeasure(measure, n1)
    measure = addNoteToMeasure(measure, n2)
    measure = addNoteToMeasure(measure, n3)
    expect(measure.notes.map((n) => n.startBeat)).toEqual([0, 1, 2])
  })
})

describe('removeNoteFromMeasure', () => {
  it('ID指定で音符を削除', () => {
    const note = createNoteEvent({ startBeat: 0 })
    const measure: Measure = { number: 1, notes: [note] }
    const result = removeNoteFromMeasure(measure, note.id)
    expect(result.notes).toHaveLength(0)
  })

  it('存在しないIDでは変化なし', () => {
    const note = createNoteEvent({ startBeat: 0 })
    const measure: Measure = { number: 1, notes: [note] }
    const result = removeNoteFromMeasure(measure, 'nonexistent')
    expect(result.notes).toHaveLength(1)
  })
})

describe('updateMeasure', () => {
  it('特定の小節を更新する', () => {
    const score = createEmptyScore({ measureCount: 3 })
    const note = createNoteEvent({ startBeat: 0 })
    const updated = updateMeasure(score, 2, (m) => addNoteToMeasure(m, note))
    expect(updated.measures[1]!.notes).toHaveLength(2) // 既存の休符 + 追加
    expect(updated.measures[0]!.notes).toHaveLength(1) // 他の小節は変化なし
  })
})

describe('appendMeasure / removeMeasure', () => {
  it('小節を末尾に追加', () => {
    const score = createEmptyScore({ measureCount: 2 })
    const updated = appendMeasure(score)
    expect(updated.measures).toHaveLength(3)
    expect(updated.measures[2]!.number).toBe(3)
    expect(updated.measures[2]!.barline).toBe('final')
    expect(updated.measures[1]!.barline).toBe('normal')
  })

  it('小節を削除', () => {
    const score = createEmptyScore({ measureCount: 4 })
    const updated = removeMeasure(score, 2)
    expect(updated.measures).toHaveLength(3)
    expect(updated.measures.map((m) => m.number)).toEqual([1, 2, 3])
    expect(updated.measures[2]!.barline).toBe('final')
  })
})

describe('totalBeats / totalDurationSeconds', () => {
  it('4/4拍子 4小節 = 16拍', () => {
    const score = createEmptyScore({ measureCount: 4 })
    expect(totalBeats(score)).toBe(16)
  })

  it('3/4拍子 4小節 = 12拍', () => {
    const score = createEmptyScore({ measureCount: 4, timeSignature: [3, 4] })
    expect(totalBeats(score)).toBe(12)
  })

  it('テンポ120で4/4 4小節 = 8秒', () => {
    const score = createEmptyScore({ measureCount: 4, tempo: 120 })
    expect(totalDurationSeconds(score)).toBeCloseTo(8, 1)
  })
})
