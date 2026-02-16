export interface ScoreBoardProps {
  score: number
  combo: number
  maxCombo: number
}

/**
 * スコアボード
 *
 * 現在のスコアとコンボ数を表示する。
 */
export function ScoreBoard({ score, combo, maxCombo }: ScoreBoardProps) {
  return (
    <div className="flex items-center gap-8 text-white">
      {/* スコア */}
      <div className="text-center">
        <div className="text-xs text-white/60 uppercase tracking-wider">Score</div>
        <div className="text-3xl font-bold tabular-nums" data-testid="score-value">
          {score.toLocaleString()}
        </div>
      </div>

      {/* コンボ */}
      <div className="text-center">
        <div className="text-xs text-white/60 uppercase tracking-wider">Combo</div>
        <div
          className={`text-3xl font-bold tabular-nums ${combo >= 10 ? 'text-yellow-400' : ''}`}
          data-testid="combo-value"
        >
          {combo}
        </div>
      </div>

      {/* 最大コンボ */}
      <div className="text-center">
        <div className="text-xs text-white/60 uppercase tracking-wider">Max</div>
        <div className="text-lg font-medium tabular-nums text-white/80" data-testid="max-combo-value">
          {maxCombo}
        </div>
      </div>
    </div>
  )
}
