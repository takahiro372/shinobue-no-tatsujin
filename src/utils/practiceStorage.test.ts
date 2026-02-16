import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  savePracticeRecord,
  getPracticeRecords,
  deletePracticeRecord,
  getPracticeStats,
  generateRecordId,
} from './practiceStorage'
import type { PracticeRecord, LongToneResult, ScaleResult } from '../types/practice'

function makeLongToneRecord(overrides?: Partial<PracticeRecord>): PracticeRecord {
  return {
    id: generateRecordId(),
    type: 'longTone',
    date: '2026-02-13',
    timestamp: Date.now(),
    shinobueKey: 'nana',
    result: {
      stability: 85,
      averageDeviation: 5,
      maxDeviation: 15,
      success: true,
      timestamp: Date.now(),
    } satisfies LongToneResult,
    ...overrides,
  }
}

function makeScaleRecord(overrides?: Partial<PracticeRecord>): PracticeRecord {
  return {
    id: generateRecordId(),
    type: 'scale',
    date: '2026-02-13',
    timestamp: Date.now(),
    shinobueKey: 'nana',
    result: {
      accuracy: 90,
      noteResults: [],
      averageResponseTimeMs: 500,
      timestamp: Date.now(),
    } satisfies ScaleResult,
    ...overrides,
  }
}

// IndexedDB をテストごとにリセット
beforeEach(() => {
  indexedDB = new IDBFactory()
})

describe('practiceStorage', () => {
  describe('generateRecordId', () => {
    it('ユニークなIDを生成する', () => {
      const id1 = generateRecordId()
      const id2 = generateRecordId()
      expect(id1).toMatch(/^practice-\d+-[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })
  })

  describe('savePracticeRecord / getPracticeRecords', () => {
    it('レコードを保存して取得できる', async () => {
      const record = makeLongToneRecord()
      await savePracticeRecord(record)

      const records = await getPracticeRecords()
      expect(records).toHaveLength(1)
      expect(records[0]!.id).toBe(record.id)
    })

    it('type フィルタで絞り込める', async () => {
      await savePracticeRecord(makeLongToneRecord({ timestamp: 1 }))
      await savePracticeRecord(makeScaleRecord({ timestamp: 2 }))
      await savePracticeRecord(makeLongToneRecord({ timestamp: 3 }))

      const longTones = await getPracticeRecords({ type: 'longTone' })
      expect(longTones).toHaveLength(2)
      expect(longTones.every((r) => r.type === 'longTone')).toBe(true)
    })

    it('limit で件数を制限できる', async () => {
      await savePracticeRecord(makeLongToneRecord({ timestamp: 1 }))
      await savePracticeRecord(makeLongToneRecord({ timestamp: 2 }))
      await savePracticeRecord(makeLongToneRecord({ timestamp: 3 }))

      const records = await getPracticeRecords({ limit: 2 })
      expect(records).toHaveLength(2)
    })

    it('timestamp 降順で返される', async () => {
      await savePracticeRecord(makeLongToneRecord({ id: 'a', timestamp: 100 }))
      await savePracticeRecord(makeLongToneRecord({ id: 'b', timestamp: 300 }))
      await savePracticeRecord(makeLongToneRecord({ id: 'c', timestamp: 200 }))

      const records = await getPracticeRecords()
      expect(records[0]!.id).toBe('b')
      expect(records[1]!.id).toBe('c')
      expect(records[2]!.id).toBe('a')
    })
  })

  describe('deletePracticeRecord', () => {
    it('レコードを削除できる', async () => {
      const record = makeLongToneRecord()
      await savePracticeRecord(record)
      await deletePracticeRecord(record.id)

      const records = await getPracticeRecords()
      expect(records).toHaveLength(0)
    })
  })

  describe('getPracticeStats', () => {
    it('レコードが無い場合はゼロの統計を返す', async () => {
      const stats = await getPracticeStats()
      expect(stats.totalSessions).toBe(0)
      expect(stats.streakDays).toBe(0)
    })

    it('モード別の平均を計算する', async () => {
      await savePracticeRecord(
        makeLongToneRecord({
          timestamp: 1,
          result: { stability: 80, averageDeviation: 5, maxDeviation: 10, success: true, timestamp: 1 },
        }),
      )
      await savePracticeRecord(
        makeLongToneRecord({
          timestamp: 2,
          result: { stability: 60, averageDeviation: 10, maxDeviation: 20, success: false, timestamp: 2 },
        }),
      )
      await savePracticeRecord(
        makeScaleRecord({
          timestamp: 3,
          result: { accuracy: 90, noteResults: [], averageResponseTimeMs: 400, timestamp: 3 },
        }),
      )

      const stats = await getPracticeStats()
      expect(stats.totalSessions).toBe(3)
      expect(stats.longToneAverageStability).toBe(70)
      expect(stats.scaleAverageAccuracy).toBe(90)
    })

    it('連続日数を計算する', async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]!

      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]!

      await savePracticeRecord(makeLongToneRecord({ date: todayStr, timestamp: 2 }))
      await savePracticeRecord(makeLongToneRecord({ date: yesterdayStr, timestamp: 1 }))

      const stats = await getPracticeStats()
      expect(stats.streakDays).toBe(2)
    })
  })
})
