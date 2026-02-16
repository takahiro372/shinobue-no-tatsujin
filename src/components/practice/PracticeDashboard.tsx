import { useEffect, useState, useCallback } from 'react'
import { usePracticeStore } from '../../store/practiceStore'
import { getPracticeRecords, getPracticeStats, deletePracticeRecord } from '../../utils/practiceStorage'
import type { PracticeRecord, LongToneResult, ScaleResult, SectionResult } from '../../types/practice'

export function PracticeDashboard() {
  const { stats, setStats, recentRecords, setRecentRecords } = usePracticeStore()
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [records, newStats] = await Promise.all([
        getPracticeRecords({ limit: 20 }),
        getPracticeStats(),
      ])
      setRecentRecords(records)
      setStats(newStats)
    } finally {
      setLoading(false)
    }
  }, [setRecentRecords, setStats])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleDelete = useCallback(async (id: string) => {
    await deletePracticeRecord(id)
    await loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="text-center py-12 theme-text-muted">読み込み中...</div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold theme-text-secondary">練習記録</h3>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="総セッション" value={stats.totalSessions} unit="回" />
        <SummaryCard label="総練習時間" value={stats.totalPracticeMinutes} unit="分" />
        <SummaryCard label="連続日数" value={stats.streakDays} unit="日" />
        <SummaryCard
          label="最終練習日"
          value={recentRecords[0]?.date ?? '---'}
          unit=""
        />
      </div>

      {/* カレンダーヒートマップ (30日分) */}
      <CalendarHeatmap records={recentRecords} />

      {/* モード別統計 */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="ロングトーン" sublabel="平均安定度" value={stats.longToneAverageStability} unit="%" />
        <StatCard label="音階" sublabel="平均正解率" value={stats.scaleAverageAccuracy} unit="%" />
        <StatCard label="区間" sublabel="平均正解率" value={stats.sectionAverageAccuracy} unit="%" />
      </div>

      {/* 直近履歴 */}
      <div className="theme-bg-card rounded-xl theme-shadow-lg p-4">
        <h4 className="font-bold text-sm theme-text mb-3">直近の記録</h4>
        {recentRecords.length === 0 ? (
          <div className="text-center py-6 theme-text-light text-sm">
            まだ記録がありません
          </div>
        ) : (
          <div className="space-y-2">
            {recentRecords.map((record) => (
              <RecordItem key={record.id} record={record} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <div className="theme-bg-card rounded-xl theme-shadow p-4 text-center">
      <div className="text-2xl font-bold theme-text-primary">
        {value}{unit && <span className="text-sm theme-text-muted ml-0.5">{unit}</span>}
      </div>
      <div className="text-xs theme-text-muted mt-1">{label}</div>
    </div>
  )
}

function StatCard({ label, sublabel, value, unit }: { label: string; sublabel: string; value: number; unit: string }) {
  return (
    <div className="theme-bg-card rounded-xl theme-shadow p-4 text-center">
      <div className="text-sm font-medium theme-text">{label}</div>
      <div className="text-xl font-bold theme-text-secondary mt-1">
        {value > 0 ? `${value.toFixed(1)}${unit}` : '---'}
      </div>
      <div className="text-xs theme-text-light">{sublabel}</div>
    </div>
  )
}

function CalendarHeatmap({ records }: { records: PracticeRecord[] }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 日別セッション数をカウント
  const dateCounts: Record<string, number> = {}
  for (const record of records) {
    dateCounts[record.date] = (dateCounts[record.date] ?? 0) + 1
  }

  const days: { date: string; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]!
    days.push({ date: dateStr, count: dateCounts[dateStr] ?? 0 })
  }

  return (
    <div className="theme-bg-card rounded-xl theme-shadow p-4">
      <h4 className="font-bold text-sm theme-text mb-2">直近30日間</h4>
      <div className="flex gap-1 flex-wrap">
        {days.map((day) => (
          <div
            key={day.date}
            className={`w-6 h-6 rounded-sm ${getHeatmapColor(day.count)}`}
            title={`${day.date}: ${day.count}回`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs theme-text-light">
        <span>少</span>
        <div className="w-3 h-3 rounded-sm bg-gray-200" />
        <div className="w-3 h-3 rounded-sm bg-green-200" />
        <div className="w-3 h-3 rounded-sm bg-green-400" />
        <div className="w-3 h-3 rounded-sm bg-green-600" />
        <span>多</span>
      </div>
    </div>
  )
}

function getHeatmapColor(count: number): string {
  if (count === 0) return 'bg-gray-200'
  if (count <= 1) return 'bg-green-200'
  if (count <= 3) return 'bg-green-400'
  return 'bg-green-600'
}

function RecordItem({ record, onDelete }: { record: PracticeRecord; onDelete: (id: string) => Promise<void> }) {
  const typeLabel = record.type === 'longTone' ? 'ロングトーン' : record.type === 'scale' ? '音階' : '区間'
  const resultSummary = getResultSummary(record)

  return (
    <div className="flex items-center justify-between py-2 px-3 theme-bg rounded">
      <div className="flex items-center gap-3">
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${getTypeColor(record.type)}`}>
          {typeLabel}
        </span>
        <span className="text-sm theme-text">{resultSummary}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs theme-text-light">{record.date}</span>
        <button
          onClick={() => void onDelete(record.id)}
          className="text-xs theme-text-light hover:theme-text-error transition-colors"
          title="削除"
        >
          ×
        </button>
      </div>
    </div>
  )
}

function getTypeColor(type: PracticeRecord['type']): string {
  switch (type) {
    case 'longTone': return 'bg-blue-100 text-blue-700'
    case 'scale': return 'bg-purple-100 text-purple-700'
    case 'section': return 'bg-orange-100 text-orange-700'
  }
}

function getResultSummary(record: PracticeRecord): string {
  switch (record.type) {
    case 'longTone': {
      const r = record.result as LongToneResult
      return `安定度 ${r.stability.toFixed(1)}% ${r.success ? '(成功)' : '(失敗)'}`
    }
    case 'scale': {
      const r = record.result as ScaleResult
      return `正解率 ${r.accuracy}%`
    }
    case 'section': {
      const r = record.result as SectionResult
      return `正解率 ${r.accuracy}%`
    }
  }
}
