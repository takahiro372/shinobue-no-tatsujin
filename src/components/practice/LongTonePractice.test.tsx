import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LongTonePractice } from './LongTonePractice'

// Zustand stores をモック
vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: () => ({
    shinobueKey: 'nana',
    tuningA4: 440,
  }),
}))

vi.mock('../../store/practiceStore', () => ({
  usePracticeStore: () => ({
    longToneConfig: {
      targetNoteNumber: 0,
      targetRegister: 'ro',
      duration: 10,
      toleranceCents: 10,
    },
    setLongToneConfig: vi.fn(),
  }),
}))

describe('LongTonePractice', () => {
  it('設定フォームを表示する', () => {
    render(<LongTonePractice classifiedNote={null} isRunning={false} />)

    expect(screen.getByText('ロングトーン練習')).toBeInTheDocument()
    expect(screen.getByText('目標音')).toBeInTheDocument()
    expect(screen.getByText('目標時間')).toBeInTheDocument()
  })

  it('duration ボタンを表示する', () => {
    render(<LongTonePractice classifiedNote={null} isRunning={false} />)

    expect(screen.getByText('5秒')).toBeInTheDocument()
    expect(screen.getByText('10秒')).toBeInTheDocument()
    expect(screen.getByText('15秒')).toBeInTheDocument()
    expect(screen.getByText('30秒')).toBeInTheDocument()
  })

  it('マイク未開始時はボタンが無効', () => {
    render(<LongTonePractice classifiedNote={null} isRunning={false} />)

    const button = screen.getByText('マイクを開始してください')
    expect(button).toBeDisabled()
  })

  it('マイク開始時は開始ボタンが有効', () => {
    render(<LongTonePractice classifiedNote={null} isRunning={true} />)

    const button = screen.getByText('開始')
    expect(button).not.toBeDisabled()
  })

  it('目標音のプレビューを表示する', () => {
    render(<LongTonePractice classifiedNote={null} isRunning={false} />)

    // 筒音 (nana, number 0, register ro)
    expect(screen.getByText('筒音')).toBeInTheDocument()
    expect(screen.getByText('B4')).toBeInTheDocument()
  })

  it('開始ボタンをクリックするとカウントダウンが表示される', () => {
    render(<LongTonePractice classifiedNote={null} isRunning={true} />)

    const button = screen.getByText('開始')
    fireEvent.click(button)

    // CountdownOverlay が表示される
    expect(screen.getByTestId('countdown-number')).toBeInTheDocument()
  })
})
