import type { PitchResult } from '../types/music'
import { frequencyToMidiNote, midiNoteToName, frequencyCentOffset } from '../utils/frequency'

/**
 * YIN アルゴリズムによるピッチ検出
 *
 * 参考: "YIN, a fundamental frequency estimator for speech and music"
 *       de Cheveigné & Kawahara, 2002
 */
export class PitchDetector {
  private readonly sampleRate: number
  private readonly bufferSize: number
  private readonly threshold: number
  private readonly minFrequency: number
  private readonly maxFrequency: number
  private readonly tuningA4: number

  constructor(options: {
    sampleRate?: number
    bufferSize?: number
    threshold?: number
    minFrequency?: number
    maxFrequency?: number
    tuningA4?: number
  } = {}) {
    this.sampleRate = options.sampleRate ?? 44100
    this.bufferSize = options.bufferSize ?? 2048
    this.threshold = options.threshold ?? 0.15
    this.minFrequency = options.minFrequency ?? 400
    this.maxFrequency = options.maxFrequency ?? 4000
    this.tuningA4 = options.tuningA4 ?? 440
  }

  /**
   * YIN アルゴリズムでバッファからピッチを検出
   */
  detect(buffer: Float32Array): PitchResult | null {
    const halfSize = Math.floor(this.bufferSize / 2)

    // ラグの範囲を周波数範囲から計算
    const minLag = Math.floor(this.sampleRate / this.maxFrequency)
    const maxLag = Math.min(halfSize, Math.floor(this.sampleRate / this.minFrequency))

    if (maxLag <= minLag) return null

    // Step 1: 差分関数 d(τ)
    const diff = this.differenceFunction(buffer, halfSize, minLag, maxLag)

    // Step 2: 累積平均正規化差分関数 d'(τ)
    const cmndf = this.cumulativeMeanNormalizedDifference(diff, minLag, maxLag)

    // Step 3: 絶対閾値法でピッチ候補を検出
    const lag = this.absoluteThreshold(cmndf, minLag, maxLag)
    if (lag === -1) return null

    // Step 4: パラボラ補間でサブサンプル精度を得る
    const refinedLag = this.parabolicInterpolation(cmndf, lag, minLag, maxLag)

    const frequency = this.sampleRate / refinedLag
    const confidence = 1 - (cmndf[lag - minLag] ?? 1)

    if (frequency < this.minFrequency || frequency > this.maxFrequency) return null

    const noteNumber = frequencyToMidiNote(frequency, this.tuningA4)
    const noteName = midiNoteToName(noteNumber)
    const centOffset = frequencyCentOffset(frequency, this.tuningA4)

    return {
      frequency,
      confidence: Math.max(0, Math.min(1, confidence)),
      noteNumber,
      noteName,
      centOffset,
      timestamp: performance.now(),
    }
  }

  /**
   * Step 1: 差分関数
   * d(τ) = Σ(x[j] - x[j+τ])²
   */
  private differenceFunction(
    buffer: Float32Array,
    halfSize: number,
    minLag: number,
    maxLag: number,
  ): Float32Array {
    const length = maxLag - minLag + 1
    const diff = new Float32Array(length)

    for (let tau = minLag; tau <= maxLag; tau++) {
      let sum = 0
      for (let j = 0; j < halfSize; j++) {
        const delta = (buffer[j] ?? 0) - (buffer[j + tau] ?? 0)
        sum += delta * delta
      }
      diff[tau - minLag] = sum
    }

    return diff
  }

  /**
   * Step 2: 累積平均正規化差分関数
   * d'(τ) = d(τ) / ((1/τ) * Σ d(j))   ただし d'(0) = 1
   */
  private cumulativeMeanNormalizedDifference(
    diff: Float32Array,
    minLag: number,
    maxLag: number,
  ): Float32Array {
    const length = maxLag - minLag + 1
    const cmndf = new Float32Array(length)
    cmndf[0] = 1

    let runningSum = 0
    for (let i = 1; i < length; i++) {
      runningSum += diff[i]!
      cmndf[i] = runningSum === 0 ? 1 : (diff[i]! * i) / runningSum
    }

    return cmndf
  }

  /**
   * Step 3: 絶対閾値法
   * cmndf が閾値を下回る最初の谷を探す
   */
  private absoluteThreshold(
    cmndf: Float32Array,
    minLag: number,
    maxLag: number,
  ): number {
    const length = maxLag - minLag + 1

    // 閾値以下の最初の谷を探す
    for (let i = 1; i < length - 1; i++) {
      if (cmndf[i]! < this.threshold) {
        // ローカル最小を探す
        while (i + 1 < length && cmndf[i + 1]! < cmndf[i]!) {
          i++
        }
        return i + minLag
      }
    }

    // 閾値以下が見つからない場合、全体の最小値を返す
    let minIndex = 0
    let minValue = cmndf[0]!
    for (let i = 1; i < length; i++) {
      if (cmndf[i]! < minValue) {
        minValue = cmndf[i]!
        minIndex = i
      }
    }

    // 最小値が高すぎる場合は検出失敗
    if (minValue > 0.5) return -1

    return minIndex + minLag
  }

  /**
   * Step 4: パラボラ補間
   * サブサンプル精度の向上
   */
  private parabolicInterpolation(
    cmndf: Float32Array,
    lag: number,
    minLag: number,
    maxLag: number,
  ): number {
    const index = lag - minLag
    const length = maxLag - minLag + 1

    if (index <= 0 || index >= length - 1) return lag

    const s0 = cmndf[index - 1]!
    const s1 = cmndf[index]!
    const s2 = cmndf[index + 1]!

    const denominator = 2 * s1 - s2 - s0
    if (Math.abs(denominator) < 1e-10) return lag

    const adjustment = (s2 - s0) / (2 * denominator)
    return lag + adjustment
  }
}

/**
 * メディアンフィルタで音程を平滑化
 */
export function medianFilter(values: number[], windowSize: number): number {
  if (values.length === 0) return 0
  if (values.length < windowSize) {
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]!
  }
  const window = values.slice(-windowSize)
  const sorted = [...window].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]!
}
