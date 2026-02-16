import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SectionPractice } from './SectionPractice'

vi.mock('../../utils/songStorage', () => ({
  getSongs: () => Promise.resolve([]),
}))

vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: () => ({
    shinobueKey: 'nana',
  }),
}))

const mockSetSectionConfig = vi.fn()
const mockSetSectionScore = vi.fn()

vi.mock('../../store/practiceStore', () => ({
  usePracticeStore: () => ({
    sectionConfig: {
      scoreTitle: 'テスト曲',
      startMeasure: 1,
      endMeasure: 4,
      tempoScale: 1.0,
      loopCount: 3,
      gradualSpeedUp: false,
    },
    setSectionConfig: mockSetSectionConfig,
    sectionScore: null,
    setSectionScore: mockSetSectionScore,
  }),
}))

describe('SectionPractice', () => {
  it('設定フォームを表示する', () => {
    render(<SectionPractice classifiedNote={null} pitchResult={null} isRunning={false} />)

    expect(screen.getByText('区間練習')).toBeInTheDocument()
    expect(screen.getByText('楽譜')).toBeInTheDocument()
    expect(screen.getByText('開始小節')).toBeInTheDocument()
    expect(screen.getByText('終了小節')).toBeInTheDocument()
  })

  it('テンポ倍率ボタンを表示する', () => {
    render(<SectionPractice classifiedNote={null} pitchResult={null} isRunning={false} />)

    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('段階的テンポアップチェックボックスを表示する', () => {
    render(<SectionPractice classifiedNote={null} pitchResult={null} isRunning={false} />)

    expect(screen.getByText('段階的テンポアップ')).toBeInTheDocument()
  })

  it('マイク未開始時はボタンが無効', () => {
    render(<SectionPractice classifiedNote={null} pitchResult={null} isRunning={false} />)

    const button = screen.getByText('マイクを開始してください')
    expect(button).toBeDisabled()
  })

  it('デモ曲を自動ロードする', () => {
    render(<SectionPractice classifiedNote={null} pitchResult={null} isRunning={false} />)

    // setSectionScore が呼ばれたことを確認
    expect(mockSetSectionScore).toHaveBeenCalled()
  })

  it('ループ数スライダーを表示する', () => {
    render(<SectionPractice classifiedNote={null} pitchResult={null} isRunning={false} />)

    expect(screen.getByText(/ループ数: 3/)).toBeInTheDocument()
  })

  it('楽譜セレクタにデモ曲オプションがある', () => {
    render(<SectionPractice classifiedNote={null} pitchResult={null} isRunning={false} />)

    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(screen.getByText('さくらさくら（デモ）')).toBeInTheDocument()
  })
})
