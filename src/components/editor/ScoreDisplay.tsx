import { useRef, useEffect, useState } from 'react'
import type { Score } from '../../score/ScoreModel'
import { renderScore, calculateCanvasHeight } from '../../score/ScoreRenderer'
import type { NotationMode } from '../../score/ScoreRenderer'

interface ScoreDisplayProps {
  score: Score
  highlightNoteId?: string | null
  width?: number
}

/**
 * Canvas ベースの楽譜表示コンポーネント
 * 数字譜 / 五線譜 / 両方の切替が可能
 */
export function ScoreDisplay({ score, highlightNoteId, width = 760 }: ScoreDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<NotationMode>('number')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const height = calculateCanvasHeight(score, { mode, width, notesPerRow: 16 })
    canvas.width = width
    canvas.height = height

    renderScore(ctx, score, {
      mode,
      width,
      height,
      notesPerRow: 16,
      highlightNoteId,
    })
  }, [score, mode, width, highlightNoteId])

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-600">プレビュー</h3>
        <div className="flex gap-1">
          {(['number', 'western', 'both'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                mode === m
                  ? 'bg-[#1B4F72] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {m === 'number' ? '数字譜' : m === 'western' ? '五線譜' : '両方'}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-auto border rounded">
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  )
}
