import type { GameResult } from '../../types/game'

export interface ResultScreenProps {
  result: GameResult
  onRetry: () => void
  onBack: () => void
}

const RANK_COLORS: Record<GameResult['rank'], string> = {
  S: 'text-yellow-400',
  A: 'text-green-400',
  B: 'text-blue-400',
  C: 'text-orange-400',
  D: 'text-red-400',
}

const RANK_GLOW: Record<GameResult['rank'], string> = {
  S: 'drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]',
  A: 'drop-shadow-[0_0_12px_rgba(74,222,128,0.6)]',
  B: '',
  C: '',
  D: '',
}

/**
 * 結果画面
 *
 * ゲーム終了後にスコア・判定内訳・ランクを表示する。
 */
export function ResultScreen({ result, onRetry, onBack }: ResultScreenProps) {
  const accuracy = result.accuracy.toFixed(1)

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* ランク */}
      <div className="text-center">
        <div className="text-sm text-white/60 uppercase tracking-wider mb-2">Rank</div>
        <div
          className={`text-8xl font-black ${RANK_COLORS[result.rank]} ${RANK_GLOW[result.rank]}`}
          data-testid="result-rank"
        >
          {result.rank}
        </div>
      </div>

      {/* スコア */}
      <div className="text-center">
        <div className="text-sm text-white/60 uppercase tracking-wider">Score</div>
        <div className="text-4xl font-bold text-white tabular-nums" data-testid="result-score">
          {result.score.toLocaleString()}
        </div>
      </div>

      {/* 精度 */}
      <div className="text-center">
        <div className="text-sm text-white/60 uppercase tracking-wider">Accuracy</div>
        <div className="text-2xl font-semibold text-white tabular-nums" data-testid="result-accuracy">
          {accuracy}%
        </div>
      </div>

      {/* 判定内訳 */}
      <div className="grid grid-cols-4 gap-4 w-full max-w-md" data-testid="result-breakdown">
        <JudgementStat label="秀" value={result.perfectCount} color="text-yellow-400" />
        <JudgementStat label="良" value={result.greatCount} color="text-white" />
        <JudgementStat label="可" value={result.goodCount} color="text-slate-400" />
        <JudgementStat label="不可" value={result.missCount} color="text-red-400" />
      </div>

      {/* コンボ情報 */}
      <div className="text-center text-white/80">
        <span className="text-sm">最大コンボ: </span>
        <span className="text-lg font-bold" data-testid="result-max-combo">{result.maxCombo}</span>
      </div>

      {/* ボタン */}
      <div className="flex gap-4 mt-4">
        <button
          onClick={onRetry}
          className="px-8 py-3 bg-[#C41E3A] text-white font-bold rounded-lg hover:bg-[#A31830] transition-colors"
          data-testid="retry-button"
        >
          もう一度
        </button>
        <button
          onClick={onBack}
          className="px-8 py-3 bg-white/20 text-white font-bold rounded-lg hover:bg-white/30 transition-colors"
          data-testid="back-button"
        >
          戻る
        </button>
      </div>
    </div>
  )
}

function JudgementStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-white/60">{label}</div>
    </div>
  )
}
