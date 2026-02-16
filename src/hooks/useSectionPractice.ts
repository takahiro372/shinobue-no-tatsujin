import { useState, useRef, useCallback } from 'react'
import type { Score } from '../score/ScoreModel'
import type { SectionConfig, SectionResult } from '../types/practice'
import type { PitchResult } from '../types/music'
import type { GameNote } from '../types/game'
import { scoreToGameNotes } from '../game/GameEngine'
import { centsBetween } from '../utils/frequency'

export type SectionPracticeStatus = 'idle' | 'active' | 'finished'

export interface SectionPracticeState {
  status: SectionPracticeStatus
  currentLoop: number
  totalLoops: number
  currentTimeMs: number
  currentNoteIndex: number
  totalNotes: number
  mistakes: number[]
  accuracy: number
  result: SectionResult | null
}

const CORRECT_THRESHOLD_CENTS = 50

/**
 * 区間練習フック
 *
 * Score から指定小節を抽出し、テンポスケール適用した GameNote[] で判定する
 */
export function useSectionPractice() {
  const [state, setState] = useState<SectionPracticeState>({
    status: 'idle',
    currentLoop: 1,
    totalLoops: 1,
    currentTimeMs: 0,
    currentNoteIndex: 0,
    totalNotes: 0,
    mistakes: [],
    accuracy: 0,
    result: null,
  })

  const notesRef = useRef<GameNote[]>([])
  const configRef = useRef<SectionConfig | null>(null)
  const statusRef = useRef<SectionPracticeStatus>('idle')
  const startTimeRef = useRef(0)
  const currentLoopRef = useRef(1)
  const nextNoteIndexRef = useRef(0)
  const mistakesRef = useRef<number[]>([])
  const correctCountRef = useRef(0)
  const totalJudgedRef = useRef(0)
  const currentTempoScaleRef = useRef(1.0)

  function extractSection(score: Score, config: SectionConfig): Score {
    const measures = score.measures.filter(
      (m) => m.number >= config.startMeasure && m.number <= config.endMeasure,
    )
    return {
      metadata: {
        ...score.metadata,
        tempo: score.metadata.tempo * config.tempoScale,
      },
      measures: measures.map((m, i) => ({ ...m, number: i + 1 })),
    }
  }

  const start = useCallback((score: Score, config: SectionConfig) => {
    const sectionScore = extractSection(score, config)
    const gameNotes = scoreToGameNotes(sectionScore).filter((n) => n.frequency !== null)

    notesRef.current = gameNotes
    configRef.current = config
    statusRef.current = 'active'
    startTimeRef.current = performance.now()
    currentLoopRef.current = 1
    nextNoteIndexRef.current = 0
    mistakesRef.current = []
    correctCountRef.current = 0
    totalJudgedRef.current = 0
    currentTempoScaleRef.current = config.tempoScale

    setState({
      status: 'active',
      currentLoop: 1,
      totalLoops: config.loopCount,
      currentTimeMs: 0,
      currentNoteIndex: 0,
      totalNotes: gameNotes.length,
      mistakes: [],
      accuracy: 0,
      result: null,
    })
  }, [])

  const update = useCallback((pitchResult: PitchResult | null) => {
    if (statusRef.current !== 'active' || !configRef.current) return

    const now = performance.now()
    const elapsed = now - startTimeRef.current
    const notes = notesRef.current
    const config = configRef.current

    // 未判定のノートをチェック
    for (let i = nextNoteIndexRef.current; i < notes.length; i++) {
      const note = notes[i]!
      const timingDelta = elapsed - note.timeMs

      // まだ時間前のノート
      if (timingDelta < -200) break

      // 判定ウィンドウを通過 → miss
      if (timingDelta > 500) {
        mistakesRef.current.push(i)
        totalJudgedRef.current++
        nextNoteIndexRef.current = i + 1
        continue
      }

      // 判定ウィンドウ内 + 音が出ている場合
      if (pitchResult && pitchResult.confidence >= 0.85 && timingDelta >= -200 && timingDelta <= 500) {
        if (note.frequency) {
          const cents = centsBetween(pitchResult.frequency, note.frequency)
          if (Math.abs(cents) <= CORRECT_THRESHOLD_CENTS) {
            correctCountRef.current++
          } else {
            mistakesRef.current.push(i)
          }
        }
        totalJudgedRef.current++
        nextNoteIndexRef.current = i + 1
        break
      }
    }

    const accuracy =
      totalJudgedRef.current > 0
        ? Math.round((correctCountRef.current / totalJudgedRef.current) * 1000) / 10
        : 0

    // ループ完了チェック
    const lastNote = notes[notes.length - 1]
    const sectionDone = lastNote && elapsed > lastNote.timeMs + lastNote.durationMs + 500

    if (sectionDone) {
      if (currentLoopRef.current < config.loopCount) {
        // 次のループ
        currentLoopRef.current++
        nextNoteIndexRef.current = 0
        startTimeRef.current = performance.now()

        // 段階的テンポアップ
        if (config.gradualSpeedUp) {
          currentTempoScaleRef.current = Math.min(
            currentTempoScaleRef.current + 0.1,
            1.0,
          )
        }

        setState((prev) => ({
          ...prev,
          currentLoop: currentLoopRef.current,
          currentTimeMs: 0,
          currentNoteIndex: 0,
          accuracy,
          mistakes: [...mistakesRef.current],
        }))
        return
      }

      // 全ループ完了
      statusRef.current = 'finished'
      const result: SectionResult = {
        accuracy,
        mistakePositions: [...mistakesRef.current],
        timestamp: Date.now(),
      }
      setState({
        status: 'finished',
        currentLoop: currentLoopRef.current,
        totalLoops: config.loopCount,
        currentTimeMs: elapsed,
        currentNoteIndex: nextNoteIndexRef.current,
        totalNotes: notes.length,
        mistakes: [...mistakesRef.current],
        accuracy,
        result,
      })
      return
    }

    setState((prev) => ({
      ...prev,
      currentTimeMs: elapsed,
      currentNoteIndex: nextNoteIndexRef.current,
      accuracy,
      mistakes: [...mistakesRef.current],
    }))
  }, [])

  const stop = useCallback(() => {
    statusRef.current = 'idle'
    setState((prev) => ({ ...prev, status: 'idle' }))
  }, [])

  const reset = useCallback(() => {
    statusRef.current = 'idle'
    notesRef.current = []
    configRef.current = null
    setState({
      status: 'idle',
      currentLoop: 1,
      totalLoops: 1,
      currentTimeMs: 0,
      currentNoteIndex: 0,
      totalNotes: 0,
      mistakes: [],
      accuracy: 0,
      result: null,
    })
  }, [])

  return { ...state, start, stop, reset, update }
}
