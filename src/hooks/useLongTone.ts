import { useState, useRef, useCallback } from 'react'
import type { ShinobueNote, ClassifiedNote } from '../types/shinobue'
import type { LongToneResult } from '../types/practice'
import { centsBetween } from '../utils/frequency'

export type LongToneStatus = 'idle' | 'countdown' | 'active' | 'finished'

export interface LongToneState {
  status: LongToneStatus
  elapsedMs: number
  inToleranceMs: number
  currentDeviation: number
  deviationHistory: number[]
  result: LongToneResult | null
}

export interface UseLongToneOptions {
  target: ShinobueNote
  durationMs: number
  toleranceCents: number
}

export function useLongTone() {
  const [state, setState] = useState<LongToneState>({
    status: 'idle',
    elapsedMs: 0,
    inToleranceMs: 0,
    currentDeviation: 0,
    deviationHistory: [],
    result: null,
  })

  const optionsRef = useRef<UseLongToneOptions | null>(null)
  const startTimeRef = useRef(0)
  const lastFrameRef = useRef(0)
  const inToleranceMsRef = useRef(0)
  const deviationHistoryRef = useRef<number[]>([])
  const rafRef = useRef(0)
  const statusRef = useRef<LongToneStatus>('idle')

  const processFrame = useCallback((classifiedNote: ClassifiedNote | null) => {
    if (statusRef.current !== 'active' || !optionsRef.current) return

    const now = performance.now()
    const elapsed = now - startTimeRef.current
    const frameDelta = now - lastFrameRef.current
    lastFrameRef.current = now

    const { target, durationMs, toleranceCents } = optionsRef.current

    let deviation = 0
    if (classifiedNote) {
      deviation = centsBetween(classifiedNote.shinobueNote.frequency, target.frequency)
    }

    if (Math.abs(deviation) <= toleranceCents && classifiedNote) {
      inToleranceMsRef.current += frameDelta
    }

    deviationHistoryRef.current.push(deviation)

    // 時間到達 → 結果計算
    if (elapsed >= durationMs) {
      const history = deviationHistoryRef.current
      const absDeviations = history.map(Math.abs)
      const stability = (inToleranceMsRef.current / durationMs) * 100
      const averageDeviation = absDeviations.length > 0
        ? absDeviations.reduce((a, b) => a + b, 0) / absDeviations.length
        : 0
      const maxDeviation = absDeviations.length > 0 ? Math.max(...absDeviations) : 0

      const result: LongToneResult = {
        stability: Math.round(stability * 10) / 10,
        averageDeviation: Math.round(averageDeviation * 10) / 10,
        maxDeviation: Math.round(maxDeviation * 10) / 10,
        success: stability >= 70,
        timestamp: Date.now(),
      }

      statusRef.current = 'finished'
      setState({
        status: 'finished',
        elapsedMs: durationMs,
        inToleranceMs: inToleranceMsRef.current,
        currentDeviation: deviation,
        deviationHistory: [...deviationHistoryRef.current],
        result,
      })
      return
    }

    setState({
      status: 'active',
      elapsedMs: elapsed,
      inToleranceMs: inToleranceMsRef.current,
      currentDeviation: deviation,
      deviationHistory: [...deviationHistoryRef.current],
      result: null,
    })
  }, [])

  const start = useCallback((options: UseLongToneOptions) => {
    optionsRef.current = options
    startTimeRef.current = performance.now()
    lastFrameRef.current = startTimeRef.current
    inToleranceMsRef.current = 0
    deviationHistoryRef.current = []
    statusRef.current = 'active'

    setState({
      status: 'active',
      elapsedMs: 0,
      inToleranceMs: 0,
      currentDeviation: 0,
      deviationHistory: [],
      result: null,
    })
  }, [])

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    statusRef.current = 'idle'
    setState((prev) => ({ ...prev, status: 'idle' }))
  }, [])

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    statusRef.current = 'idle'
    optionsRef.current = null
    inToleranceMsRef.current = 0
    deviationHistoryRef.current = []
    setState({
      status: 'idle',
      elapsedMs: 0,
      inToleranceMs: 0,
      currentDeviation: 0,
      deviationHistory: [],
      result: null,
    })
  }, [])

  return { ...state, start, stop, reset, processFrame }
}
