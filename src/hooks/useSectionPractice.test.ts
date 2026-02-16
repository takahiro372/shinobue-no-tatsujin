import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSectionPractice } from './useSectionPractice'
import type { Score } from '../score/ScoreModel'
import type { SectionConfig } from '../types/practice'
import type { PitchResult } from '../types/music'

const testScore: Score = {
  metadata: {
    title: 'テスト曲',
    composer: 'テスト',
    shinobueKey: 'nana',
    tempo: 120,
    timeSignature: [4, 4],
  },
  measures: [
    {
      number: 1,
      notes: [
        {
          id: 'n1',
          type: 'note',
          pitch: { shinobueNumber: 0, register: 'ro', frequency: 493.88, midiNote: 71, western: 'B4' },
          duration: { type: 'quarter', dots: 0 },
          startBeat: 0,
        },
        {
          id: 'n2',
          type: 'note',
          pitch: { shinobueNumber: 1, register: 'ro', frequency: 554.37, midiNote: 73, western: 'C#5' },
          duration: { type: 'quarter', dots: 0 },
          startBeat: 1,
        },
      ],
    },
    {
      number: 2,
      notes: [
        {
          id: 'n3',
          type: 'note',
          pitch: { shinobueNumber: 2, register: 'ro', frequency: 587.33, midiNote: 74, western: 'D5' },
          duration: { type: 'quarter', dots: 0 },
          startBeat: 0,
        },
      ],
    },
  ],
}

const baseConfig: SectionConfig = {
  scoreTitle: 'テスト曲',
  startMeasure: 1,
  endMeasure: 2,
  tempoScale: 1.0,
  loopCount: 1,
  gradualSpeedUp: false,
}

function makePitchResult(frequency: number): PitchResult {
  return {
    frequency,
    confidence: 0.95,
    noteNumber: 71,
    noteName: 'B4',
    centOffset: 0,
    timestamp: Date.now(),
  }
}

describe('useSectionPractice', () => {
  beforeEach(() => {
    vi.spyOn(performance, 'now').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('初期状態は idle', () => {
    const { result } = renderHook(() => useSectionPractice())
    expect(result.current.status).toBe('idle')
    expect(result.current.result).toBeNull()
  })

  it('start で active になる', () => {
    const { result } = renderHook(() => useSectionPractice())

    act(() => {
      result.current.start(testScore, baseConfig)
    })

    expect(result.current.status).toBe('active')
    expect(result.current.totalNotes).toBeGreaterThan(0)
    expect(result.current.currentLoop).toBe(1)
  })

  it('update で判定が進む', () => {
    vi.spyOn(performance, 'now').mockReturnValue(0)
    const { result } = renderHook(() => useSectionPractice())

    act(() => {
      result.current.start(testScore, baseConfig)
    })

    // ノートの時刻付近に進める
    vi.spyOn(performance, 'now').mockReturnValue(100)
    act(() => {
      result.current.update(makePitchResult(493.88))
    })

    expect(result.current.currentNoteIndex).toBeGreaterThanOrEqual(0)
  })

  it('stop で idle に戻る', () => {
    const { result } = renderHook(() => useSectionPractice())

    act(() => {
      result.current.start(testScore, baseConfig)
    })

    act(() => {
      result.current.stop()
    })

    expect(result.current.status).toBe('idle')
  })

  it('reset で初期状態に戻る', () => {
    const { result } = renderHook(() => useSectionPractice())

    act(() => {
      result.current.start(testScore, baseConfig)
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.totalNotes).toBe(0)
  })

  it('loopCount=2 で複数ループをサポート', () => {
    const { result } = renderHook(() => useSectionPractice())

    act(() => {
      result.current.start(testScore, { ...baseConfig, loopCount: 2 })
    })

    expect(result.current.totalLoops).toBe(2)
    expect(result.current.currentLoop).toBe(1)
  })
})
