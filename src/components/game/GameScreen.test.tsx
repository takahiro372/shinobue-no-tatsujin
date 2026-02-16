import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { ScoreBoard } from './ScoreBoard'
import { JudgementDisplay } from './JudgementDisplay'
import { CountdownOverlay } from './CountdownOverlay'
import { ResultScreen } from './ResultScreen'
import { GameSelectScreen } from './GameSelectScreen'
import type { GameResult, JudgementResult } from '../../types/game'

// songStorage mock (IndexedDB is not available in test environment)
vi.mock('../../utils/songStorage', () => ({
  getSongs: () => Promise.resolve([]),
}))

// Canvas mock
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    new Proxy({} as CanvasRenderingContext2D, {
      get() { return () => {} },
      set() { return true },
    }),
  )
})

// ── ScoreBoard ──

describe('ScoreBoard', () => {
  it('スコアを表示する', () => {
    render(<ScoreBoard score={12500} combo={5} maxCombo={8} />)
    expect(screen.getByTestId('score-value')).toHaveTextContent('12,500')
  })

  it('コンボを表示する', () => {
    render(<ScoreBoard score={0} combo={15} maxCombo={15} />)
    expect(screen.getByTestId('combo-value')).toHaveTextContent('15')
  })

  it('最大コンボを表示する', () => {
    render(<ScoreBoard score={0} combo={0} maxCombo={20} />)
    expect(screen.getByTestId('max-combo-value')).toHaveTextContent('20')
  })

  it('コンボ10以上で色が変わる', () => {
    render(<ScoreBoard score={0} combo={10} maxCombo={10} />)
    const comboEl = screen.getByTestId('combo-value')
    expect(comboEl.className).toContain('text-yellow-400')
  })

  it('コンボ10未満では通常色', () => {
    render(<ScoreBoard score={0} combo={9} maxCombo={9} />)
    const comboEl = screen.getByTestId('combo-value')
    expect(comboEl.className).not.toContain('text-yellow-400')
  })
})

// ── JudgementDisplay ──

describe('JudgementDisplay', () => {
  it('null の場合は何も表示しない', () => {
    const { container } = render(<JudgementDisplay judgement={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('perfect で「秀」を表示する', () => {
    const judgement: JudgementResult = {
      type: 'perfect', timingDelta: 5, pitchDelta: 2, noteId: 'n1',
    }
    render(<JudgementDisplay judgement={judgement} />)
    expect(screen.getByRole('status')).toHaveTextContent('秀')
  })

  it('miss で「不可」を表示する', () => {
    const judgement: JudgementResult = {
      type: 'miss', timingDelta: 200, pitchDelta: 0, noteId: 'n2',
    }
    render(<JudgementDisplay judgement={judgement} />)
    expect(screen.getByRole('status')).toHaveTextContent('不可')
  })

  it('great で「良」を表示する', () => {
    const judgement: JudgementResult = {
      type: 'great', timingDelta: 40, pitchDelta: 15, noteId: 'n3',
    }
    render(<JudgementDisplay judgement={judgement} />)
    expect(screen.getByRole('status')).toHaveTextContent('良')
  })

  it('good で「可」を表示する', () => {
    const judgement: JudgementResult = {
      type: 'good', timingDelta: 80, pitchDelta: 30, noteId: 'n4',
    }
    render(<JudgementDisplay judgement={judgement} />)
    expect(screen.getByRole('status')).toHaveTextContent('可')
  })
})

// ── CountdownOverlay ──

describe('CountdownOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('初期値を表示する', () => {
    const onComplete = vi.fn()
    render(<CountdownOverlay seconds={3} onComplete={onComplete} />)
    expect(screen.getByTestId('countdown-number')).toHaveTextContent('3')
  })

  it('1秒ごとにカウントダウンする', () => {
    const onComplete = vi.fn()
    render(<CountdownOverlay seconds={3} onComplete={onComplete} />)

    act(() => { vi.advanceTimersByTime(1000) })
    expect(screen.getByTestId('countdown-number')).toHaveTextContent('2')

    act(() => { vi.advanceTimersByTime(1000) })
    expect(screen.getByTestId('countdown-number')).toHaveTextContent('1')
  })

  it('カウントが0になったら onComplete を呼ぶ', () => {
    const onComplete = vi.fn()
    render(<CountdownOverlay seconds={3} onComplete={onComplete} />)

    // 各秒ごとに act でラップ (React state 更新のため)
    act(() => { vi.advanceTimersByTime(1000) })  // 3→2
    act(() => { vi.advanceTimersByTime(1000) })  // 2→1
    act(() => { vi.advanceTimersByTime(1000) })  // 1→0
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})

// ── ResultScreen ──

describe('ResultScreen', () => {
  const mockResult: GameResult = {
    score: 8500,
    maxCombo: 12,
    perfectCount: 5,
    greatCount: 3,
    goodCount: 1,
    missCount: 1,
    totalNotes: 10,
    accuracy: 90,
    rank: 'A',
  }

  it('ランクを表示する', () => {
    render(<ResultScreen result={mockResult} onRetry={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByTestId('result-rank')).toHaveTextContent('A')
  })

  it('スコアを表示する', () => {
    render(<ResultScreen result={mockResult} onRetry={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByTestId('result-score')).toHaveTextContent('8,500')
  })

  it('精度を表示する', () => {
    render(<ResultScreen result={mockResult} onRetry={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByTestId('result-accuracy')).toHaveTextContent('90.0%')
  })

  it('最大コンボを表示する', () => {
    render(<ResultScreen result={mockResult} onRetry={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByTestId('result-max-combo')).toHaveTextContent('12')
  })

  it('リトライボタンが動作する', () => {
    const onRetry = vi.fn()
    render(<ResultScreen result={mockResult} onRetry={onRetry} onBack={vi.fn()} />)
    fireEvent.click(screen.getByTestId('retry-button'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('戻るボタンが動作する', () => {
    const onBack = vi.fn()
    render(<ResultScreen result={mockResult} onRetry={vi.fn()} onBack={onBack} />)
    fireEvent.click(screen.getByTestId('back-button'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('S ランクで金色表示', () => {
    const sResult = { ...mockResult, rank: 'S' as const, accuracy: 100 }
    render(<ResultScreen result={sResult} onRetry={vi.fn()} onBack={vi.fn()} />)
    const rank = screen.getByTestId('result-rank')
    expect(rank.className).toContain('text-yellow-400')
  })

  it('D ランクで赤色表示', () => {
    const dResult = { ...mockResult, rank: 'D' as const, accuracy: 20 }
    render(<ResultScreen result={dResult} onRetry={vi.fn()} onBack={vi.fn()} />)
    const rank = screen.getByTestId('result-rank')
    expect(rank.className).toContain('text-red-400')
  })
})

// ── GameSelectScreen ──

const MOCK_MUSICXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>テスト曲</work-title></work>
  <identification>
    <encoding><software>test</software></encoding>
  </identification>
  <part-list><score-part id="P1"><part-name>Shinobue</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <direction><sound tempo="80"/></direction>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>C</step><alter>1</alter><octave>5</octave></pitch><duration>2</duration><type>half</type></note>
    </measure>
  </part>
</score-partwise>`

describe('GameSelectScreen', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
      const signal = (init as RequestInit | undefined)?.signal
      if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))
      return Promise.resolve({ text: () => Promise.resolve(MOCK_MUSICXML) } as Response)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ゲーム開始ボタンがある', () => {
    render(<GameSelectScreen onStart={vi.fn()} />)
    expect(screen.getByTestId('start-game-button')).toBeDefined()
  })

  it('難易度を選択できる', () => {
    render(<GameSelectScreen onStart={vi.fn()} />)
    const radios = screen.getAllByRole('radio')
    expect(radios.length).toBe(4)
  })

  it('ゲーム開始ボタンで onStart が呼ばれる', async () => {
    const onStart = vi.fn()
    render(<GameSelectScreen onStart={onStart} />)
    // Wait for fetch to load the song
    await waitFor(() => {
      expect(screen.getByTestId('start-game-button')).not.toBeDisabled()
    })
    fireEvent.click(screen.getByTestId('start-game-button'))
    expect(onStart).toHaveBeenCalledTimes(1)
    // score と difficulty が渡される
    expect(onStart.mock.calls[0]![0]).toHaveProperty('metadata')
    expect(onStart.mock.calls[0]![1]).toBe('intermediate') // デフォルト
  })

  it('難易度を変更してから開始できる', async () => {
    const onStart = vi.fn()
    render(<GameSelectScreen onStart={onStart} />)
    // Wait for fetch to load the song
    await waitFor(() => {
      expect(screen.getByTestId('start-game-button')).not.toBeDisabled()
    })
    // 達人を選択
    const masterRadio = screen.getAllByRole('radio')[3]!
    fireEvent.click(masterRadio)
    fireEvent.click(screen.getByTestId('start-game-button'))
    expect(onStart.mock.calls[0]![1]).toBe('master')
  })
})
