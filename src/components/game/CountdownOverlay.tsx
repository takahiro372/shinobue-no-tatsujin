import { useState, useEffect, useRef } from 'react'

export interface CountdownOverlayProps {
  seconds?: number
  onComplete: () => void
}

/**
 * カウントダウンオーバーレイ
 *
 * ゲーム開始前に 3, 2, 1 とカウントダウンする。
 */
export function CountdownOverlay({ seconds = 3, onComplete }: CountdownOverlayProps) {
  const [count, setCount] = useState(seconds)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (count <= 0) {
      onCompleteRef.current()
      return
    }
    const timer = setTimeout(() => setCount(count - 1), 1000)
    return () => clearTimeout(timer)
  }, [count])

  if (count <= 0) return null

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
      <span
        className="text-8xl font-black text-white animate-ping"
        role="timer"
        aria-label={`${count}秒前`}
        data-testid="countdown-number"
      >
        {count}
      </span>
    </div>
  )
}
