import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScalePractice } from './ScalePractice'

vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: () => ({
    shinobueKey: 'nana',
  }),
}))

vi.mock('../../store/practiceStore', () => ({
  usePracticeStore: () => ({
    scaleConfig: {
      pattern: 'ascending',
      tempo: 80,
      metronomeEnabled: false,
      registerFilter: 'all',
    },
    setScaleConfig: vi.fn(),
  }),
}))

vi.mock('../../utils/metronome', () => ({
  createMetronome: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    setTempo: vi.fn(),
    isRunning: () => false,
    currentBeat: () => 0,
    onBeat: vi.fn(),
  }),
}))

describe('ScalePractice', () => {
  it('設定フォームを表示する', () => {
    render(<ScalePractice classifiedNote={null} isRunning={false} />)

    expect(screen.getByText('音階練習')).toBeInTheDocument()
    expect(screen.getByText('パターン')).toBeInTheDocument()
    expect(screen.getByText('音域')).toBeInTheDocument()
  })

  it('パターン選択ボタンを表示する', () => {
    render(<ScalePractice classifiedNote={null} isRunning={false} />)

    expect(screen.getByText('上行')).toBeInTheDocument()
    expect(screen.getByText('下行')).toBeInTheDocument()
    expect(screen.getByText('1つ飛び')).toBeInTheDocument()
    expect(screen.getByText('ランダム')).toBeInTheDocument()
  })

  it('音域フィルタボタンを表示する', () => {
    render(<ScalePractice classifiedNote={null} isRunning={false} />)

    expect(screen.getByText('全音域')).toBeInTheDocument()
    expect(screen.getByText('呂音')).toBeInTheDocument()
    expect(screen.getByText('甲音')).toBeInTheDocument()
    expect(screen.getByText('大甲音')).toBeInTheDocument()
  })

  it('マイク未開始時はボタンが無効', () => {
    render(<ScalePractice classifiedNote={null} isRunning={false} />)

    const button = screen.getByText('マイクを開始してください')
    expect(button).toBeDisabled()
  })

  it('マイク開始時は開始ボタンが有効', () => {
    render(<ScalePractice classifiedNote={null} isRunning={true} />)

    const button = screen.getByText('開始')
    expect(button).not.toBeDisabled()
  })

  it('テンポスライダーを表示する', () => {
    render(<ScalePractice classifiedNote={null} isRunning={false} />)

    expect(screen.getByText(/テンポ: 80 BPM/)).toBeInTheDocument()
  })

  it('メトロノームチェックボックスを表示する', () => {
    render(<ScalePractice classifiedNote={null} isRunning={false} />)

    expect(screen.getByText('メトロノーム ON')).toBeInTheDocument()
  })
})
