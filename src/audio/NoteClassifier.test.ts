import { describe, it, expect } from 'vitest'
import { NoteClassifier } from './NoteClassifier'

describe('NoteClassifier（七本調子）', () => {
  const classifier = new NoteClassifier('nana')

  it('C#5 (554.37Hz) → 一（呂）', () => {
    const result = classifier.classify(554.37, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('一')
    expect(result!.shinobueNote.number).toBe(1)
    expect(result!.shinobueNote.register).toBe('ro')
    expect(Math.abs(result!.centOffset)).toBeLessThan(5)
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
    // 一 C#5 (554.37Hz) より少し低い 550Hz → セント偏差は小さい
    const result = classifier.classify(550, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('一')
    expect(result!.centOffset).toBeLessThan(0) // 低い方にずれている
    expect(Math.abs(result!.centOffset)).toBeLessThan(50)
  })

  it('440Hz は七本調子の有効な音域外（50セント超）なので null', () => {
    // 440Hz (A4) → 最も近い一 C#5 (554.37Hz) まで約400セント
    const result = classifier.classify(440, 0.95)
    expect(result).toBeNull()
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

  it('B4 (493.88Hz) → 一（呂）', () => {
    const result = classifier.classify(493.88, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('一')
    expect(result!.shinobueNote.frequency).toBe(493.88)
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

  it('D5 (587.33Hz) → 一（呂）', () => {
    const result = classifier.classify(587.33, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('一')
    expect(result!.shinobueNote.western).toBe('D5')
  })

  it('E5 (659.25Hz) → 二（呂）', () => {
    const result = classifier.classify(659.25, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('二')
    expect(result!.shinobueNote.western).toBe('E5')
  })

  it('F5 (698.46Hz) → 三（呂）', () => {
    const result = classifier.classify(698.46, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('三')
    expect(result!.shinobueNote.western).toBe('F5')
  })

  it('G5 (783.99Hz) → 四（呂）', () => {
    const result = classifier.classify(783.99, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('四')
    expect(result!.shinobueNote.western).toBe('G5')
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

  it('C6 (1046.50Hz) → 七（呂）', () => {
    const result = classifier.classify(1046.50, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('七')
    expect(result!.shinobueNote.western).toBe('C6')
  })

  it('findNearest でも C6 → 七 を返す', () => {
    const result = classifier.findNearest(1046.50)
    expect(result).not.toBeNull()
    expect(result!.note.name).toBe('七')
    expect(Math.abs(result!.centOffset)).toBeLessThan(1)
  })

  it('findNearest でも B5 → 六 を返す', () => {
    const result = classifier.findNearest(987.77)
    expect(result).not.toBeNull()
    expect(result!.note.name).toBe('六')
    expect(Math.abs(result!.centOffset)).toBeLessThan(1)
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

  it('roku に切り替えると一が B4 になる', () => {
    classifier.setKey('roku')
    const result = classifier.classify(493.88, 0.95)
    expect(result).not.toBeNull()
    expect(result!.shinobueNote.name).toBe('一')

    // 元に戻す
    classifier.setKey('nana')
  })
})
