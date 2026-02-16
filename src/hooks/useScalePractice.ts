import { useState, useRef, useCallback } from 'react'
import type { ShinobueNote, ClassifiedNote } from '../types/shinobue'
import type { ScaleConfig, ScaleNoteResult, ScaleResult } from '../types/practice'
import { centsBetween } from '../utils/frequency'

export type ScalePracticeStatus = 'idle' | 'active' | 'finished'

export interface ScalePracticeState {
  status: ScalePracticeStatus
  currentIndex: number
  noteSequence: ShinobueNote[]
  noteResults: ScaleNoteResult[]
  result: ScaleResult | null
}

const CORRECT_THRESHOLD_CENTS = 50

export function useScalePractice() {
  const [state, setState] = useState<ScalePracticeState>({
    status: 'idle',
    currentIndex: 0,
    noteSequence: [],
    noteResults: [],
    result: null,
  })

  const noteSequenceRef = useRef<ShinobueNote[]>([])
  const noteResultsRef = useRef<ScaleNoteResult[]>([])
  const currentIndexRef = useRef(0)
  const statusRef = useRef<ScalePracticeStatus>('idle')
  const beatTimestampsRef = useRef<number[]>([])
  const lastBeatTimeRef = useRef(0)

  const generateSequence = useCallback(
    (chart: ShinobueNote[], config: ScaleConfig): ShinobueNote[] => {
      let filtered = chart
      if (config.registerFilter !== 'all') {
        filtered = chart.filter((n) => n.register === config.registerFilter)
      }
      if (filtered.length === 0) filtered = chart

      switch (config.pattern) {
        case 'descending':
          return [...filtered].reverse()
        case 'skip':
          return filtered.filter((_, i) => i % 2 === 0)
        case 'random':
          return fisherYatesShuffle([...filtered])
        case 'ascending':
        default:
          return [...filtered]
      }
    },
    [],
  )

  const start = useCallback(
    (chart: ShinobueNote[], config: ScaleConfig) => {
      const sequence = generateSequence(chart, config)
      noteSequenceRef.current = sequence
      noteResultsRef.current = []
      currentIndexRef.current = 0
      statusRef.current = 'active'
      beatTimestampsRef.current = []
      lastBeatTimeRef.current = performance.now()

      setState({
        status: 'active',
        currentIndex: 0,
        noteSequence: sequence,
        noteResults: [],
        result: null,
      })
    },
    [generateSequence],
  )

  const processNote = useCallback((classifiedNote: ClassifiedNote | null) => {
    if (statusRef.current !== 'active') return
    const sequence = noteSequenceRef.current
    const idx = currentIndexRef.current
    if (idx >= sequence.length) return

    const expected = sequence[idx]!
    const now = performance.now()
    const responseTime = now - lastBeatTimeRef.current
    lastBeatTimeRef.current = now
    beatTimestampsRef.current.push(responseTime)

    let noteResult: ScaleNoteResult
    if (classifiedNote) {
      const cents = centsBetween(
        classifiedNote.shinobueNote.frequency,
        expected.frequency,
      )
      const isCorrect = Math.abs(cents) <= CORRECT_THRESHOLD_CENTS
      noteResult = {
        expectedNote: expected.name,
        actualNote: classifiedNote.shinobueNote.name,
        centOffset: Math.round(cents * 10) / 10,
        isCorrect,
      }
    } else {
      noteResult = {
        expectedNote: expected.name,
        actualNote: null,
        centOffset: 0,
        isCorrect: false,
      }
    }

    noteResultsRef.current.push(noteResult)
    currentIndexRef.current = idx + 1

    // 全ノート完了
    if (currentIndexRef.current >= sequence.length) {
      statusRef.current = 'finished'
      const results = noteResultsRef.current
      const correctCount = results.filter((r) => r.isCorrect).length
      const accuracy = Math.round((correctCount / results.length) * 1000) / 10
      const avgResponseTime =
        beatTimestampsRef.current.length > 0
          ? Math.round(
              beatTimestampsRef.current.reduce((a, b) => a + b, 0) /
                beatTimestampsRef.current.length,
            )
          : 0

      const result: ScaleResult = {
        accuracy,
        noteResults: results,
        averageResponseTimeMs: avgResponseTime,
        timestamp: Date.now(),
      }

      setState({
        status: 'finished',
        currentIndex: currentIndexRef.current,
        noteSequence: sequence,
        noteResults: [...results],
        result,
      })
      return
    }

    setState({
      status: 'active',
      currentIndex: currentIndexRef.current,
      noteSequence: sequence,
      noteResults: [...noteResultsRef.current],
      result: null,
    })
  }, [])

  const stop = useCallback(() => {
    statusRef.current = 'idle'
    setState((prev) => ({ ...prev, status: 'idle' }))
  }, [])

  const reset = useCallback(() => {
    statusRef.current = 'idle'
    noteSequenceRef.current = []
    noteResultsRef.current = []
    currentIndexRef.current = 0
    setState({
      status: 'idle',
      currentIndex: 0,
      noteSequence: [],
      noteResults: [],
      result: null,
    })
  }, [])

  return { ...state, start, stop, reset, processNote }
}

function fisherYatesShuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}
