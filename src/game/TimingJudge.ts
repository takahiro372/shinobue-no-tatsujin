import type { JudgementType } from '../types/music'
import type { JudgementResult, DifficultyConfig } from '../types/game'

/**
 * 判定基準 (タイミング + 音程の複合判定)
 *
 * | 判定    | タイミング許容 | 音程許容   | スコア |
 * |---------|--------------|-----------|--------|
 * | Perfect | ±30ms        | ±10 cents | 1000   |
 * | Great   | ±60ms        | ±25 cents | 800    |
 * | Good    | ±100ms       | ±40 cents | 500    |
 * | Miss    | それ以外      | それ以外   | 0      |
 */

interface JudgementThreshold {
  type: JudgementType
  timingMs: number
  pitchCents: number
}

const BASE_THRESHOLDS: JudgementThreshold[] = [
  { type: 'perfect', timingMs: 30, pitchCents: 10 },
  { type: 'great', timingMs: 60, pitchCents: 25 },
  { type: 'good', timingMs: 100, pitchCents: 40 },
]

export class TimingJudge {
  private thresholds: JudgementThreshold[]

  constructor(difficultyConfig?: DifficultyConfig) {
    const scale = difficultyConfig?.judgementScale ?? 1.0
    this.thresholds = BASE_THRESHOLDS.map((t) => ({
      type: t.type,
      timingMs: t.timingMs * scale,
      pitchCents: t.pitchCents * scale,
    }))
  }

  /**
   * タイミングと音程の偏差から判定を行う
   *
   * @param timingDeltaMs 判定ラインからのずれ (ms, 正=遅い)
   * @param pitchDeltaCents 基準音からのずれ (cents)
   * @param noteId 対象のノートID
   */
  judge(timingDeltaMs: number, pitchDeltaCents: number, noteId: string): JudgementResult {
    const absTiming = Math.abs(timingDeltaMs)
    const absPitch = Math.abs(pitchDeltaCents)

    for (const threshold of this.thresholds) {
      if (absTiming <= threshold.timingMs && absPitch <= threshold.pitchCents) {
        return {
          type: threshold.type,
          timingDelta: timingDeltaMs,
          pitchDelta: pitchDeltaCents,
          noteId,
        }
      }
    }

    return {
      type: 'miss',
      timingDelta: timingDeltaMs,
      pitchDelta: pitchDeltaCents,
      noteId,
    }
  }

  /**
   * タイミングのみで判定 (音程が検出できない場合)
   * 休符を吹いてしまった場合は miss
   */
  judgeTimingOnly(timingDeltaMs: number, noteId: string): JudgementResult {
    return this.judge(timingDeltaMs, 0, noteId)
  }

  /**
   * ノートが判定ウィンドウ内かどうか
   * 最も緩い閾値 (good) の範囲内かチェック
   */
  isInJudgementWindow(timingDeltaMs: number): boolean {
    const maxWindow = this.thresholds[this.thresholds.length - 1]
    if (!maxWindow) return false
    return Math.abs(timingDeltaMs) <= maxWindow.timingMs
  }

  /**
   * ノートが判定ウィンドウを完全に通過したか (miss 確定)
   */
  isPastJudgementWindow(timingDeltaMs: number): boolean {
    const maxWindow = this.thresholds[this.thresholds.length - 1]
    if (!maxWindow) return true
    // ノートが判定ラインを通り過ぎた場合 (timingDelta > 0 = ノートは過去)
    return timingDeltaMs > maxWindow.timingMs
  }

  /** 判定ウィンドウの最大値 (ms) を取得 */
  getMaxWindow(): number {
    const last = this.thresholds[this.thresholds.length - 1]
    return last?.timingMs ?? 100
  }
}
