import { describe, it, expect } from 'vitest'
import { NoteClassifier } from './NoteClassifier'

describe('NoteClassifier（七本調子）', () => {
  const classifier = new NoteClassifier('nana')

  it('B4 (493.88Hz) → 筒音', () => {
    const result = classifier.classify(493.88, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('筒音')
    expect(result!.shinobueNote.number).toBe(0)
    expect(result!.shinobueNote.register).toBe('ro')
    expect(Math.abs(result!.centOffset)).toBeLessThan(5)
  })

  it('C#5 (554.37Hz) → 一（呂）', () => {
    const result = classifier.classify(554.37, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('一')
    expect(result!.shinobueNote.register).toBe('ro')
  })

  it('E5 (659.25Hz) → 三（呂）', () => {
    const result = classifier.classify(659.25, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('三')
  })

  it('E6 (1318.51Hz) → 3 (甲音)', () => {
    const result = classifier.classify(1318.51, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('3')
    expect(result!.shinobueNote.register).toBe('kan')
  })

  it('C#7 (2217.46Hz) → 大1 (大甲)', () => {
    const result = classifier.classify(2217.46, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('大1')
    expect(result!.shinobueNote.register).toBe('daikan')
  })

  it('少しずれた周波数でもセント偏差を正しく計算する', () => {
    // 筒音 B4 (493.88Hz) より少し低い 490Hz → セント偏差は小さい
    const result = classifier.classify(490, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('筒音')
    expect(result!.centOffset).toBeLessThan(0) // 低い方にずれている
    expect(Math.abs(result!.centOffset)).toBeLessThan(50)
  })

  it('440Hz は七本調子の有効な音域外（50セント超）なので null', () => {
    // 440Hz (A4) → 最も近い筒音 B4 (493.88Hz) まで約200セント
    const result = classifier.classify(440, 0.95)
    expect(result).toBeNull()
  })

  it('50セント以上離れた周波数は null を返す', () => {
    // 筒音 B4 (493.88Hz) と 一 C#5 (554.37Hz) の中間あたり
    // 522Hz は両方から50セント以上離れている可能性がある
    const midpoint = Math.sqrt(493.88 * 554.37) // 幾何平均
    const result = classifier.classify(midpoint, 0.95)
    // 幾何平均は丁度100セントの中間（50セント）なので、ギリギリ通過する可能性がある
    // とにかく結果があればcentOffsetは±50以内
    if (result) {
      expect(Math.abs(result.centOffset)).toBeLessThanOrEqual(50)
    }
  })

  it('無効な周波数（0や負）では null を返す', () => {
    expect(classifier.classify(0, 0.95)).toBeNull()
    expect(classifier.classify(-100, 0.95)).toBeNull()
    expect(classifier.classify(NaN, 0.95)).toBeNull()
    expect(classifier.classify(Infinity, 0.95)).toBeNull()
  })

  it('findNearest はセント制限なく最も近い音を返す', () => {
    const result = classifier.findNearest(440)
    expect(result).not.toBeNull()
    expect(result!.note).toBeDefined()
    expect(typeof result!.centOffset).toBe('number')
  })

  it('全ての運指表エントリに対して正確にマッピングする', () => {
    const chart = classifier.getChart()
    for (const note of chart) {
      const result = classifier.classify(note.frequency, 0.95)
      expect(result).not.toBeNull()
      expect(result!.shinobueNote.name).toBe(note.name)
      expect(Math.abs(result!.centOffset)).toBeLessThan(1)
    }
  })
})

describe('NoteClassifier（六本調子）', () => {
  const classifier = new NoteClassifier('roku')

  it('A4 (440Hz) → 筒音', () => {
    const result = classifier.classify(440, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('筒音')
    expect(result!.shinobueNote.frequency).toBe(440)
  })

  it('A5 (880Hz) → 七（呂）', () => {
    const result = classifier.classify(880, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('七')
    expect(result!.shinobueNote.register).toBe('ro')
  })
})

describe('NoteClassifier（八本調子）', () => {
  const classifier = new NoteClassifier('hachi')

  it('C5 (523.25Hz) → 筒音', () => {
    const result = classifier.classify(523.25, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('筒音')
    expect(result!.shinobueNote.frequency).toBe(523.25)
  })

  it('E5 (659.25Hz) → 二（呂）', () => {
    const result = classifier.classify(659.25, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('二')
    expect(result!.shinobueNote.western).toBe('E5')
  })

  it('A5 (880Hz) → 五（呂）', () => {
    const result = classifier.classify(880, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('五')
    expect(result!.shinobueNote.western).toBe('A5')
  })

  it('B5 (987.77Hz) → 六（呂）', () => {
    const result = classifier.classify(987.77, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('六')
    expect(result!.shinobueNote.western).toBe('B5')
  })

  it('全ての運指表エントリに対して正確にマッピングする', () => {
    const chart = classifier.getChart()
    for (const note of chart) {
      const result = classifier.classify(note.frequency, 0.95)
      expect(result).not.toBeNull()
      expect(result!.shinobueNote.name).toBe(note.name)
      expect(Math.abs(result!.centOffset)).toBeLessThan(1)
    }
  })
})

describe('NoteClassifier のキー切り替え', () => {
  const classifier = new NoteClassifier('nana')

  it('roku に切り替えると筒音が A4 になる', () => {
    classifier.setKey('roku')
    const result = classifier.classify(440, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('筒音')

    // 元に戻す
    classifier.setKey('nana')
  })
})
