import type { JudgementType } from '../types/music'
import type { JudgementResult, GameResult } from '../types/game'

/**
 * スコア計算
 *
 * | 判定    | 基本スコア |
 * |---------|----------|
 * | Perfect | 1000     |
 * | Great   | 800      |
 * | Good    | 500      |
 * | Miss    | 0        |
 *
 * 最終スコア = Σ (基本スコア × コンボ倍率)
 */

const BASE_SCORES: Record<JudgementType, number> = {
  perfect: 1000,
  great: 800,
  good: 500,
  miss: 0,
}

export class ScoreCalculator {
  private _score = 0
  private readonly judgements: JudgementResult[] = []

  get score(): number {
    return this._score
  }

  /** 判定を追加してスコアを加算 */
  add(judgement: JudgementResult, comboMultiplier: number): number {
    this.judgements.push(judgement)
    const base = BASE_SCORES[judgement.type]
    const gained = Math.round(base * comboMultiplier)
    this._score += gained
    return gained
  }

  /** 各判定のカウントを取得 */
  getCounts(): Record<JudgementType, number> {
    const counts: Record<JudgementType, number> = {
      perfect: 0, great: 0, good: 0, miss: 0,
    }
    for (const j of this.judgements) {
      counts[j.type]++
    }
    return counts
  }

  /** ゲーム結果を生成 */
  getResult(maxCombo: number, totalNotes: number): GameResult {
    const counts = this.getCounts()
    const hitCount = counts.perfect + counts.great + counts.good
    const accuracy = totalNotes > 0 ? (hitCount / totalNotes) * 100 : 0

    return {
      score: this._score,
      maxCombo,
      perfectCount: counts.perfect,
      greatCount: counts.great,
      goodCount: counts.good,
      missCount: counts.miss,
      totalNotes,
      accuracy,
      rank: calculateRank(accuracy),
    }
  }

  /** リセット */
  reset(): void {
    this._score = 0
    this.judgements.length = 0
  }
}

function calculateRank(accuracy: number): GameResult['rank'] {
  if (accuracy >= 95) return 'S'
  if (accuracy >= 85) return 'A'
  if (accuracy >= 70) return 'B'
  if (accuracy >= 50) return 'C'
  return 'D'
}

/** 基本スコアを取得するヘルパー */
export function getBaseScore(type: JudgementType): number {
  return BASE_SCORES[type]
}
