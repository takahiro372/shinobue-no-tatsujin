import { describe, it, expect, beforeEach } from 'vitest'
import { usePracticeStore } from './practiceStore'

beforeEach(() => {
  usePracticeStore.setState(usePracticeStore.getInitialState())
})

describe('practiceStore', () => {
  it('初期モードは tuner', () => {
    expect(usePracticeStore.getState().mode).toBe('tuner')
  })

  it('モードを変更できる', () => {
    usePracticeStore.getState().setMode('longTone')
    expect(usePracticeStore.getState().mode).toBe('longTone')
  })

  describe('setLongToneConfig', () => {
    it('部分更新でマージされる', () => {
      const { setLongToneConfig } = usePracticeStore.getState()
      setLongToneConfig({ duration: 30 })
      const config = usePracticeStore.getState().longToneConfig
      expect(config.duration).toBe(30)
      expect(config.targetNoteNumber).toBe(1)
      expect(config.toleranceCents).toBe(10)
    })
  })

  describe('setScaleConfig', () => {
    it('部分更新でマージされる', () => {
      const { setScaleConfig } = usePracticeStore.getState()
      setScaleConfig({ pattern: 'descending', tempo: 120 })
      const config = usePracticeStore.getState().scaleConfig
      expect(config.pattern).toBe('descending')
      expect(config.tempo).toBe(120)
      expect(config.metronomeEnabled).toBe(true)
    })
  })

  describe('setSectionConfig', () => {
    it('部分更新でマージされる', () => {
      const { setSectionConfig } = usePracticeStore.getState()
      setSectionConfig({ startMeasure: 3, endMeasure: 8 })
      const config = usePracticeStore.getState().sectionConfig
      expect(config.startMeasure).toBe(3)
      expect(config.endMeasure).toBe(8)
      expect(config.tempoScale).toBe(1.0)
    })
  })

  it('recentRecords を更新できる', () => {
    const records = [
      {
        id: 'test-1',
        type: 'longTone' as const,
        date: '2026-02-13',
        timestamp: Date.now(),
        shinobueKey: 'nana',
        result: { stability: 80, averageDeviation: 5, maxDeviation: 10, success: true, timestamp: Date.now() },
      },
    ]
    usePracticeStore.getState().setRecentRecords(records)
    expect(usePracticeStore.getState().recentRecords).toHaveLength(1)
  })

  it('stats を更新できる', () => {
    usePracticeStore.getState().setStats({
      totalSessions: 10,
      totalPracticeMinutes: 30,
      streakDays: 5,
      longToneAverageStability: 75,
      scaleAverageAccuracy: 80,
      sectionAverageAccuracy: 70,
    })
    expect(usePracticeStore.getState().stats.totalSessions).toBe(10)
  })
})
