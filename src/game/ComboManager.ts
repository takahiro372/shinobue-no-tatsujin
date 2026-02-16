import type { JudgementType } from '../types/music'

/**
 * コンボ管理
 *
 * - miss 以外の判定でコンボが増加
 * - miss でコンボがリセット
 * - コンボ倍率: 10コンボごとに x0.1 加算 (最大 x2.0)
 */
export class ComboManager {
  private _combo = 0
  private _maxCombo = 0

  get combo(): number {
    return this._combo
  }

  get maxCombo(): number {
    return this._maxCombo
  }

  /** コンボ倍率を取得 (1.0 〜 2.0) */
  get multiplier(): number {
    return Math.min(2.0, 1.0 + Math.floor(this._combo / 10) * 0.1)
  }

  /** 判定を登録してコンボを更新 */
  register(judgement: JudgementType): void {
    if (judgement === 'miss') {
      this._combo = 0
    } else {
      this._combo++
      if (this._combo > this._maxCombo) {
        this._maxCombo = this._combo
      }
    }
  }

  /** リセット */
  reset(): void {
    this._combo = 0
    this._maxCombo = 0
  }
}
