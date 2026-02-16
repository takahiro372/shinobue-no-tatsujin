interface PitchMeterProps {
  centOffset: number   // -50 ~ +50
  isActive: boolean
}

/**
 * リアルタイム音程メーター
 * 中央が正しい音程。左がフラット、右がシャープ。
 */
export function PitchMeter({ centOffset, isActive }: PitchMeterProps) {
  const clampedOffset = Math.max(-50, Math.min(50, centOffset))
  // -50～+50 を 0～100% に変換
  const position = ((clampedOffset + 50) / 100) * 100

  const getColor = () => {
    const abs = Math.abs(clampedOffset)
    if (abs <= 10) return 'bg-[var(--color-success)]'
    if (abs <= 25) return 'bg-[var(--color-warning)]'
    return 'bg-[var(--color-error)]'
  }

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs theme-text-muted mb-1">
        <span>-50</span>
        <span>0</span>
        <span>+50</span>
      </div>
      <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
        {/* 中央線 */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-400 z-10" />

        {/* インジケーター */}
        {isActive && (
          <div
            className={`absolute top-0.5 bottom-0.5 w-4 rounded-full transition-all duration-75 ${getColor()}`}
            style={{ left: `calc(${position}% - 8px)` }}
          />
        )}
      </div>
      <div className="text-center text-sm mt-1 font-mono">
        {isActive ? (
          <span className={clampedOffset >= 0 ? 'theme-text-error' : 'theme-text-secondary'}>
            {clampedOffset >= 0 ? '+' : ''}{clampedOffset.toFixed(1)} cent
          </span>
        ) : (
          <span className="theme-text-light">---</span>
        )}
      </div>
    </div>
  )
}
