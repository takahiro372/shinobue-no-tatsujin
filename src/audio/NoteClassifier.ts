import type { ShinobueNote, ClassifiedNote } from '../types/shinobue'
import { getFingeringChart } from '../shinobue/FingeringChart'
import { centsBetween } from '../utils/frequency'

/**
 * 検出された周波数を篠笛の音名にマッピングする
 *
 * 処理:
 * 1. 周波数 → 選択中の調子の運指表から最も近い音を検索
 * 2. セント偏差を計算
 * 3. ±50セント以内なら有効な音として認識
 */
export class NoteClassifier {
  private chart: ShinobueNote[]

  constructor(shinobueKey: string) {
    this.chart = getFingeringChart(shinobueKey)
  }

  /** 調子を変更 */
  setKey(shinobueKey: string): void {
    this.chart = getFingeringChart(shinobueKey)
  }

  /** 現在の運指表を取得 */
  getChart(): ShinobueNote[] {
    return this.chart
  }

  /**
   * 周波数を篠笛の音にマッピングする
   *
   * @param frequency 検出された周波数 (Hz)
   * @param confidence 検出の信頼度 (0-1)
   * @returns マッピング結果 or null (有効な音でない場合)
   */
  classify(frequency: number, confidence: number): ClassifiedNote | null {
    if (frequency <= 0 || !isFinite(frequency)) return null

    let bestMatch: ShinobueNote | null = null
    let bestCentOffset = Infinity

    for (const note of this.chart) {
      const cents = centsBetween(frequency, note.frequency)
      if (Math.abs(cents) < Math.abs(bestCentOffset)) {
        bestCentOffset = cents
        bestMatch = note
      }
    }

    if (!bestMatch) return null

    // ±50セント以内でなければ無効
    if (Math.abs(bestCentOffset) > 50) return null

    return {
      shinobueNote: bestMatch,
      centOffset: bestCentOffset,
      confidence,
    }
  }

  /**
   * 周波数から最も近い篠笛の音を取得（セント制限なし）
   * チューナー表示等で使用
   */
  findNearest(frequency: number): { note: ShinobueNote; centOffset: number } | null {
    if (frequency <= 0 || !isFinite(frequency)) return null

    let bestMatch: ShinobueNote | null = null
    let bestCentOffset = Infinity

    for (const note of this.chart) {
      const cents = centsBetween(frequency, note.frequency)
      if (Math.abs(cents) < Math.abs(bestCentOffset)) {
        bestCentOffset = cents
        bestMatch = note
      }
    }

    if (!bestMatch) return null

    return { note: bestMatch, centOffset: bestCentOffset }
  }
}
