import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScalePractice } from './useScalePractice'
import type { ShinobueNote, ClassifiedNote } from '../types/shinobue'
import type { ScaleConfig } from '../types/practice'

const chart: ShinobueNote[] = [
  { number: 1, register: 'ro', fingering: [true, true, true, true, true, true, false], frequency: 554.37, western: 'C#5', name: '一' },
  { number: 2, register: 'ro', fingering: [true, true, true, true, true, false, false], frequency: 587.33, western: 'D5', name: '二' },
  { number: 3, register: 'ro', fingering: [true, true, true, true, false, false, false], frequency: 659.25, western: 'E5', name: '三' },
]

const baseConfig: ScaleConfig = {
  pattern: 'ascending',
  tempo: 120,
  metronomeEnabled: false,
  registerFilter: 'all',
}

function makeClassified(note: ShinobueNote): ClassifiedNote {
  return { shinobueNote: note, centOffset: 0, confidence: 0.95 }
}

describe('useScalePractice', () => {
  it('初期状態は idle', () => {
    const { result } = renderHook(() => useScalePractice())
    expect(result.current.status).toBe('idle')
    expect(result.current.noteSequence).toHaveLength(0)
  })

  it('ascending パターンでシーケンスを生成する', () => {
    const { result } = renderHook(() => useScalePractice())

    act(() => {
      result.current.start(chart, baseConfig)
    })

    expect(result.current.status).toBe('active')
    expect(result.current.noteSequence).toHaveLength(3)
    expect(result.current.noteSequence[0]!.name).toBe('一')
  })

  it('descending パターンで逆順', () => {
    const { result } = renderHook(() => useScalePractice())

    act(() => {
      result.current.start(chart, { ...baseConfig, pattern: 'descending' })
    })

    expect(result.current.noteSequence[0]!.name).toBe('三')
  })

  it('skip パターンで1つ飛び', () => {
    const { result } = renderHook(() => useScalePractice())

    act(() => {
      result.current.start(chart, { ...baseConfig, pattern: 'skip' })
    })

    expect(result.current.noteSequence).toHaveLength(2) // index 0, 2
    expect(result.current.noteSequence[0]!.name).toBe('一')
    expect(result.current.noteSequence[1]!.name).toBe('三')
  })

  it('正しい音を出すと isCorrect になる', () => {
    const { result } = renderHook(() => useScalePractice())

    act(() => {
      result.current.start(chart, baseConfig)
    })

    act(() => {
      result.current.processNote(makeClassified(chart[0]!))
    })

    expect(result.current.noteResults).toHaveLength(1)
    expect(result.current.noteResults[0]!.isCorrect).toBe(true)
    expect(result.current.currentIndex).toBe(1)
  })

  it('全ノート完了で finished + result が生成される', () => {
    const { result } = renderHook(() => useScalePractice())

    act(() => {
      result.current.start(chart, baseConfig)
    })

    for (const note of chart) {
      act(() => {
        result.current.processNote(makeClassified(note))
      })
    }

    expect(result.current.status).toBe('finished')
    expect(result.current.result).not.toBeNull()
    expect(result.current.result!.accuracy).toBe(100)
    expect(result.current.result!.noteResults).toHaveLength(3)
  })

  it('null (無音) は不正解', () => {
    const { result } = renderHook(() => useScalePractice())

    act(() => {
      result.current.start(chart, baseConfig)
    })

    act(() => {
      result.current.processNote(null)
    })

    expect(result.current.noteResults[0]!.isCorrect).toBe(false)
  })

  it('reset で初期状態に戻る', () => {
    const { result } = renderHook(() => useScalePractice())

    act(() => {
      result.current.start(chart, baseConfig)
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.noteSequence).toHaveLength(0)
  })
})
