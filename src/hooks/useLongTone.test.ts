import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLongTone } from './useLongTone'
import type { ShinobueNote, ClassifiedNote } from '../types/shinobue'

const targetNote: ShinobueNote = {
  number: 0,
  register: 'ro',
  fingering: [true, true, true, true, true, true, true],
  frequency: 493.88,
  western: 'B4',
  name: '筒音',
}

function makeClassified(freqOffset = 0): ClassifiedNote {
  return {
    shinobueNote: { ...targetNote, frequency: targetNote.frequency + freqOffset },
    centOffset: 0,
    confidence: 0.95,
  }
}

describe('useLongTone', () => {
  beforeEach(() => {
    vi.spyOn(performance, 'now').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('初期状態は idle', () => {
    const { result } = renderHook(() => useLongTone())
    expect(result.current.status).toBe('idle')
    expect(result.current.result).toBeNull()
  })

  it('start で active になる', () => {
    const { result } = renderHook(() => useLongTone())

    act(() => {
      result.current.start({
        target: targetNote,
        durationMs: 5000,
        toleranceCents: 10,
      })
    })

    expect(result.current.status).toBe('active')
  })

  it('processFrame で偏差が記録される', () => {
    vi.spyOn(performance, 'now').mockReturnValue(0)
    const { result } = renderHook(() => useLongTone())

    act(() => {
      result.current.start({
        target: targetNote,
        durationMs: 10000,
        toleranceCents: 10,
      })
    })

    vi.spyOn(performance, 'now').mockReturnValue(100)
    act(() => {
      result.current.processFrame(makeClassified())
    })

    expect(result.current.deviationHistory.length).toBeGreaterThan(0)
  })

  it('duration 経過後に finished + result が生成される', () => {
    vi.spyOn(performance, 'now').mockReturnValue(0)
    const { result } = renderHook(() => useLongTone())

    act(() => {
      result.current.start({
        target: targetNote,
        durationMs: 1000,
        toleranceCents: 10,
      })
    })

    // 時間を進める
    vi.spyOn(performance, 'now').mockReturnValue(500)
    act(() => {
      result.current.processFrame(makeClassified())
    })

    vi.spyOn(performance, 'now').mockReturnValue(1001)
    act(() => {
      result.current.processFrame(makeClassified())
    })

    expect(result.current.status).toBe('finished')
    expect(result.current.result).not.toBeNull()
    expect(result.current.result!.stability).toBeGreaterThan(0)
  })

  it('reset で初期状態に戻る', () => {
    const { result } = renderHook(() => useLongTone())

    act(() => {
      result.current.start({
        target: targetNote,
        durationMs: 5000,
        toleranceCents: 10,
      })
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.deviationHistory).toHaveLength(0)
  })

  it('stop で idle に戻る', () => {
    const { result } = renderHook(() => useLongTone())

    act(() => {
      result.current.start({
        target: targetNote,
        durationMs: 5000,
        toleranceCents: 10,
      })
    })

    act(() => {
      result.current.stop()
    })

    expect(result.current.status).toBe('idle')
  })
})
