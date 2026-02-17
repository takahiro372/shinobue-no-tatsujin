import { describe, it, expect } from 'vitest'
import { PitchDetector, medianFilter } from './PitchDetector'

/**
 * テスト用サイン波を生成
 */
function generateSineWave(
  frequency: number,
  sampleRate: number,
  length: number,
  amplitude = 0.8,
): Float32Array {
  const buffer = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    buffer[i] = amplitude * Math.sin(2 * Math.PI * frequency * i / sampleRate)
  }
  return buffer
}

describe('PitchDetector', () => {
  const sampleRate = 44100
  const bufferSize = 2048
  const detector = new PitchDetector({ sampleRate, bufferSize })

  it('440Hz のサイン波を正しく検出する', () => {
    const buffer = generateSineWave(440, sampleRate, bufferSize)
    const result = detector.detect(buffer)
    expect(result).not.toBeNull()
    expect(result!.frequency).toBeCloseTo(440, 0)
    expect(result!.confidence).toBeGreaterThan(0.8)
    expect(result!.noteName).toBe('A4')
  })

  it('880Hz のサイン波を正しく検出する', () => {
    const buffer = generateSineWave(880, sampleRate, bufferSize)
    const result = detector.detect(buffer)
    expect(result).not.toBeNull()
    expect(result!.frequency).toBeCloseTo(880, 0)
    expect(result!.noteName).toBe('A5')
  })

  it('494Hz (B4) を正しく検出する', () => {
    const buffer = generateSineWave(494, sampleRate, bufferSize)
    const result = detector.detect(buffer)
    expect(result).not.toBeNull()
    expect(result!.frequency).toBeCloseTo(494, 0)
  })

  it('554Hz (C#5, 七本調子の一) を正しく検出する', () => {
    const buffer = generateSineWave(554, sampleRate, bufferSize)
    const result = detector.detect(buffer)
    expect(result).not.toBeNull()
    expect(result!.frequency).toBeCloseTo(554, 0)
  })

  it('1320Hz (E6 付近) を正しく検出する', () => {
    const buffer = generateSineWave(1320, sampleRate, bufferSize)
    const result = detector.detect(buffer)
    expect(result).not.toBeNull()
    expect(result!.frequency).toBeCloseTo(1320, 0)
  })

  it('2000Hz を正しく検出する', () => {
    const buffer = generateSineWave(2000, sampleRate, bufferSize)
    const result = detector.detect(buffer)
    expect(result).not.toBeNull()
    expect(result!.frequency).toBeCloseTo(2000, -1)
  })

  it('無音バッファでは null を返す', () => {
    const buffer = new Float32Array(bufferSize)
    const result = detector.detect(buffer)
    expect(result).toBeNull()
  })

  it('ノイズのみのバッファでは信頼度が低い', () => {
    const buffer = new Float32Array(bufferSize)
    for (let i = 0; i < bufferSize; i++) {
      buffer[i] = (Math.random() - 0.5) * 0.1
    }
    const result = detector.detect(buffer)
    // ノイズでは検出できないか、信頼度が非常に低い
    if (result !== null) {
      expect(result.confidence).toBeLessThan(0.8)
    }
  })

  it('セント偏差が ±50 以内', () => {
    const buffer = generateSineWave(440, sampleRate, bufferSize)
    const result = detector.detect(buffer)
    expect(result).not.toBeNull()
    expect(Math.abs(result!.centOffset)).toBeLessThanOrEqual(50)
  })

  it('篠笛の音域内の様々な周波数で精度が99%以上', () => {
    const testFrequencies = [440, 523, 587, 660, 740, 784, 880, 988, 1047, 1175, 1319, 1480, 1568, 1760, 1976]

    for (const freq of testFrequencies) {
      const buffer = generateSineWave(freq, sampleRate, bufferSize)
      const result = detector.detect(buffer)
      expect(result).not.toBeNull()
      const error = Math.abs(result!.frequency - freq) / freq
      expect(error).toBeLessThan(0.01) // 1% 以内
    }
  })
})

describe('medianFilter', () => {
  it('奇数長のwindowで中央値を返す', () => {
    expect(medianFilter([1, 3, 2, 5, 4], 5)).toBe(3)
  })

  it('window より短い配列でも動作する', () => {
    expect(medianFilter([5, 1, 3], 5)).toBe(3)
  })

  it('空配列では0を返す', () => {
    expect(medianFilter([], 5)).toBe(0)
  })

  it('windowSize分の直近の値から中央値を返す', () => {
    expect(medianFilter([100, 200, 300, 1, 3, 2], 3)).toBe(2)
  })
})
