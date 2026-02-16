import type { PracticeRecord, PracticeStats, LongToneResult, ScaleResult, SectionResult } from '../types/practice'
import { openDB } from './db'

const STORE_NAME = 'practice'

export function generateRecordId(): string {
  return `practice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function savePracticeRecord(record: PracticeRecord): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getPracticeRecords(filter?: {
  type?: PracticeRecord['type']
  limit?: number
}): Promise<PracticeRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.index('timestamp').openCursor(null, 'prev')
    const results: PracticeRecord[] = []

    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) {
        resolve(results)
        return
      }
      const record = cursor.value as PracticeRecord
      if (!filter?.type || record.type === filter.type) {
        results.push(record)
      }
      if (filter?.limit && results.length >= filter.limit) {
        resolve(results)
        return
      }
      cursor.continue()
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deletePracticeRecord(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getPracticeStats(): Promise<PracticeStats> {
  const records = await getPracticeRecords()

  const stats: PracticeStats = {
    totalSessions: records.length,
    totalPracticeMinutes: 0,
    streakDays: 0,
    longToneAverageStability: 0,
    scaleAverageAccuracy: 0,
    sectionAverageAccuracy: 0,
  }

  if (records.length === 0) return stats

  // 練習日の集合
  const dates = new Set(records.map((r) => r.date))
  stats.streakDays = calculateStreak(dates)

  // モード別集計
  const longTones = records.filter((r) => r.type === 'longTone')
  const scales = records.filter((r) => r.type === 'scale')
  const sections = records.filter((r) => r.type === 'section')

  if (longTones.length > 0) {
    stats.longToneAverageStability =
      longTones.reduce((sum, r) => sum + (r.result as LongToneResult).stability, 0) / longTones.length
  }
  if (scales.length > 0) {
    stats.scaleAverageAccuracy =
      scales.reduce((sum, r) => sum + (r.result as ScaleResult).accuracy, 0) / scales.length
  }
  if (sections.length > 0) {
    stats.sectionAverageAccuracy =
      sections.reduce((sum, r) => sum + (r.result as SectionResult).accuracy, 0) / sections.length
  }

  // 概算の練習時間 (セッション数 × 平均2分)
  stats.totalPracticeMinutes = records.length * 2

  return stats
}

function calculateStreak(dates: Set<string>): number {
  if (dates.size === 0) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let streak = 0
  const current = new Date(today)

  while (true) {
    const dateStr = current.toISOString().split('T')[0]!
    if (dates.has(dateStr)) {
      streak++
      current.setDate(current.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}
