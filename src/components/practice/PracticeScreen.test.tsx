import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PracticeScreen } from './PracticeScreen'
import type { PitchDetectionState } from '../../hooks/usePitchDetection'

// Zustand モック
const mockSetMode = vi.fn()
let mockMode = 'tuner'

vi.mock('../../store/practiceStore', () => ({
  usePracticeStore: () => ({
    mode: mockMode,
    setMode: mockSetMode,
  }),
}))

vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: () => ({
    shinobueKey: 'nana',
    tuningA4: 440,
    setTuningA4: vi.fn(),
  }),
}))

vi.mock('./TunerView', () => ({
  TunerView: () => <div data-testid="tuner-view">TunerView</div>,
}))

vi.mock('./LongTonePractice', () => ({
  LongTonePractice: () => <div data-testid="longtone-view">LongTonePractice</div>,
}))

vi.mock('./ScalePractice', () => ({
  ScalePractice: () => <div data-testid="scale-view">ScalePractice</div>,
}))

vi.mock('./SectionPractice', () => ({
  SectionPractice: () => <div data-testid="section-view">SectionPractice</div>,
}))

vi.mock('./PracticeDashboard', () => ({
  PracticeDashboard: () => <div data-testid="dashboard-view">PracticeDashboard</div>,
}))

function makeMockPitch(): PitchDetectionState & { start: () => Promise<void>; stop: () => void } {
  return {
    isRunning: false,
    error: null,
    pitchResult: null,
    classifiedNote: null,
    volume: -Infinity,
    pitchHistory: [],
    rawData: {
      rawFrequency: null,
      rawConfidence: null,
      volume: -Infinity,
      noiseGateActive: false,
      belowConfidence: false,
      sampleRate: 44100,
    },
    start: vi.fn(),
    stop: vi.fn(),
  }
}

describe('PracticeScreen', () => {
  it('サブナビゲーションを表示する', () => {
    render(<PracticeScreen pitch={makeMockPitch()} />)

    expect(screen.getByText('チューナー')).toBeInTheDocument()
    expect(screen.getByText('ロングトーン')).toBeInTheDocument()
    expect(screen.getByText('音階')).toBeInTheDocument()
    expect(screen.getByText('区間')).toBeInTheDocument()
    expect(screen.getByText('記録')).toBeInTheDocument()
  })

  it('デフォルトはチューナービューを表示する', () => {
    mockMode = 'tuner'
    render(<PracticeScreen pitch={makeMockPitch()} />)

    expect(screen.getByTestId('tuner-view')).toBeInTheDocument()
  })

  it('マイク開始ボタンを表示する (未起動時)', () => {
    mockMode = 'tuner'
    render(<PracticeScreen pitch={makeMockPitch()} />)

    expect(screen.getByText('マイク開始')).toBeInTheDocument()
  })

  it('マイク停止ボタンを表示する (起動中)', () => {
    mockMode = 'tuner'
    const pitch = makeMockPitch()
    pitch.isRunning = true
    render(<PracticeScreen pitch={pitch} />)

    expect(screen.getByText('マイク停止')).toBeInTheDocument()
  })

  it('ナビボタンクリックで setMode が呼ばれる', () => {
    mockMode = 'tuner'
    render(<PracticeScreen pitch={makeMockPitch()} />)

    fireEvent.click(screen.getByText('ロングトーン'))
    expect(mockSetMode).toHaveBeenCalledWith('longTone')
  })

  it('dashboard モードではマイクボタンを非表示', () => {
    mockMode = 'dashboard'
    render(<PracticeScreen pitch={makeMockPitch()} />)

    expect(screen.queryByText('マイク開始')).not.toBeInTheDocument()
    expect(screen.getByTestId('dashboard-view')).toBeInTheDocument()
  })
})
