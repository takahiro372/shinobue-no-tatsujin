import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { PracticeDashboard } from './PracticeDashboard'

const mockSetStats = vi.fn()
const mockSetRecentRecords = vi.fn()

vi.mock('../../store/practiceStore', () => ({
  usePracticeStore: () => ({
    stats: {
      totalSessions: 5,
      totalPracticeMinutes: 10,
      streakDays: 3,
      longToneAverageStability: 80,
      scaleAverageAccuracy: 75,
      sectionAverageAccuracy: 0,
    },
    setStats: mockSetStats,
    recentRecords: [],
    setRecentRecords: mockSetRecentRecords,
  }),
}))

// IndexedDB をテストごとにリセット
beforeEach(() => {
  indexedDB = new IDBFactory()
})

describe('PracticeDashboard', () => {
  it('読み込み後にサマリーカードを表示する', async () => {
    render(<PracticeDashboard />)

    // loading 状態を待って完了を確認
    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('総セッション')).toBeInTheDocument()
    expect(screen.getByText('総練習時間')).toBeInTheDocument()
    expect(screen.getByText('連続日数')).toBeInTheDocument()
    expect(screen.getByText('最終練習日')).toBeInTheDocument()
  })

  it('読み込み後にモード別統計を表示する', async () => {
    render(<PracticeDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('ロングトーン')).toBeInTheDocument()
    expect(screen.getByText('音階')).toBeInTheDocument()
    expect(screen.getByText('区間')).toBeInTheDocument()
  })

  it('読み込み後にヒートマップを表示する', async () => {
    render(<PracticeDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('直近30日間')).toBeInTheDocument()
  })

  it('レコードがない場合はメッセージを表示する', async () => {
    render(<PracticeDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('まだ記録がありません')).toBeInTheDocument()
  })
})
