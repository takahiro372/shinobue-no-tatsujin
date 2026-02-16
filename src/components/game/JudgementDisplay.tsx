import { useState, useEffect, useRef } from 'react'
import type { JudgementResult } from '../../types/game'

export interface JudgementDisplayProps {
  judgement: JudgementResult | null
}

const JUDGEMENT_LABELS: Record<JudgementResult['type'], string> = {
  perfect: '秀',
  great: '良',
  good: '可',
  miss: '不可',
}

const JUDGEMENT_COLORS: Record<JudgementResult['type'], string> = {
  perfect: 'text-yellow-400',
  great: 'text-white',
  good: 'text-slate-400',
  miss: 'text-red-500',
}

const JUDGEMENT_GLOW: Record<JudgementResult['type'], string> = {
  perfect: 'drop-shadow-[0_0_12px_rgba(255,215,0,0.8)]',
  great: 'drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]',
  good: '',
  miss: '',
}

/**
 * 判定表示コンポーネント
 *
 * 判定結果をアニメーション付きで大きく表示する。
 */
export function JudgementDisplay({ judgement }: JudgementDisplayProps) {
  const [visible, setVisible] = useState(false)
  const [current, setCurrent] = useState<JudgementResult | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(0 as unknown as ReturnType<typeof setTimeout>)

  useEffect(() => {
    if (!judgement) return

    setCurrent(judgement)
    setVisible(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), 600)
  }, [judgement])

  if (!visible || !current) return null

  const label = JUDGEMENT_LABELS[current.type]
  const colorClass = JUDGEMENT_COLORS[current.type]
  const glowClass = JUDGEMENT_GLOW[current.type]

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <span
        className={`text-5xl font-bold ${colorClass} ${glowClass} animate-bounce`}
        role="status"
        aria-label={`判定: ${label}`}
      >
        {label}
      </span>
    </div>
  )
}
