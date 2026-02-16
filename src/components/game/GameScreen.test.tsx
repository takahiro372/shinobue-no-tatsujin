import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { ScoreBoard } from './ScoreBoard'
import { JudgementDisplay } from './JudgementDisplay'
import { CountdownOverlay } from './CountdownOverlay'
import { ResultScreen } from './ResultScreen'
import { GameSelectScreen } from './GameSelectScreen'
import type { GameResult, JudgementResult } from '../../types/game'
import { DIFFICULTY_CONFIGS } from '../../types/game'

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

// ── DIFFICULTY_CONFIGS ──

describe('DIFFICULTY_CONFIGS', () => {
  it('4つの難易度が定義されている', () => {
    expect(Object.keys(DIFFICULTY_CONFIGS)).toHaveLength(4)
    expect(DIFFICULTY_CONFIGS).toHaveProperty('beginner')
    expect(DIFFICULTY_CONFIGS).toHaveProperty('intermediate')
    expect(DIFFICULTY_CONFIGS).toHaveProperty('advanced')
    expect(DIFFICULTY_CONFIGS).toHaveProperty('master')
  })

  it('スクロール速度が難易度順に増加する', () => {
    expect(DIFFICULTY_CONFIGS.beginner.scrollSpeed).toBeLessThan(DIFFICULTY_CONFIGS.intermediate.scrollSpeed)
    expect(DIFFICULTY_CONFIGS.intermediate.scrollSpeed).toBeLessThan(DIFFICULTY_CONFIGS.advanced.scrollSpeed)
    expect(DIFFICULTY_CONFIGS.advanced.scrollSpeed).toBeLessThan(DIFFICULTY_CONFIGS.master.scrollSpeed)
  })

  it('判定倍率が難易度順に厳しくなる', () => {
    expect(DIFFICULTY_CONFIGS.beginner.judgementScale).toBeGreaterThan(DIFFICULTY_CONFIGS.intermediate.judgementScale)
    expect(DIFFICULTY_CONFIGS.intermediate.judgementScale).toBeGreaterThan(DIFFICULTY_CONFIGS.advanced.judgementScale)
    expect(DIFFICULTY_CONFIGS.advanced.judgementScale).toBeGreaterThan(DIFFICULTY_CONFIGS.master.judgementScale)
  })

  it('運指ガイドが難易度で変化する', () => {
    expect(DIFFICULTY_CONFIGS.beginner.showFingering).toBe('always')
    expect(DIFFICULTY_CONFIGS.intermediate.showFingering).toBe('always')
    expect(DIFFICULTY_CONFIGS.advanced.showFingering).toBe('next')
    expect(DIFFICULTY_CONFIGS.master.showFingering).toBe('none')
  })

  it('音程メーターサイズが難易度で変化する', () => {
    expect(DIFFICULTY_CONFIGS.beginner.pitchMeterSize).toBe('large')
    expect(DIFFICULTY_CONFIGS.intermediate.pitchMeterSize).toBe('large')
    expect(DIFFICULTY_CONFIGS.advanced.pitchMeterSize).toBe('small')
    expect(DIFFICULTY_CONFIGS.master.pitchMeterSize).toBe('hidden')
  })

  it('装飾音要求が難易度で変化する', () => {
    expect(DIFFICULTY_CONFIGS.beginner.requireOrnaments).toBe(false)
    expect(DIFFICULTY_CONFIGS.intermediate.requireOrnaments).toBe(false)
    expect(DIFFICULTY_CONFIGS.advanced.requireOrnaments).toBe(true)
    expect(DIFFICULTY_CONFIGS.master.requireOrnaments).toBe(true)
  })

  it('音域制限が難易度で変化する', () => {
    expect(DIFFICULTY_CONFIGS.beginner.allowedRegisters).toEqual(['ro'])
    expect(DIFFICULTY_CONFIGS.intermediate.allowedRegisters).toEqual(['ro', 'kan'])
    expect(DIFFICULTY_CONFIGS.advanced.allowedRegisters).toEqual(['ro', 'kan', 'daikan'])
    expect(DIFFICULTY_CONFIGS.master.allowedRegisters).toEqual(['ro', 'kan', 'daikan'])
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
    // score, difficulty, scrollSpeed が渡される
    expect(onStart.mock.calls[0]![0]).toHaveProperty('metadata')
    expect(onStart.mock.calls[0]![1]).toBe('intermediate') // デフォルト難易度
    expect(onStart.mock.calls[0]![2]).toBe(1.0) // intermediate のデフォルト速度
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
    expect(onStart.mock.calls[0]![2]).toBe(1.8) // master のデフォルト速度
  })

  it('スクロール速度スライダーが表示される', () => {
    render(<GameSelectScreen onStart={vi.fn()} />)
    expect(screen.getByTestId('scroll-speed-slider')).toBeInTheDocument()
    expect(screen.getByTestId('scroll-speed-label')).toBeInTheDocument()
  })

  it('スクロール速度を変更して開始できる', async () => {
    const onStart = vi.fn()
    render(<GameSelectScreen onStart={onStart} />)
    await waitFor(() => {
      expect(screen.getByTestId('start-game-button')).not.toBeDisabled()
    })

    // スライダーを「とても遅い」(index=0, value=0.4) に変更
    const slider = screen.getByTestId('scroll-speed-slider')
    fireEvent.change(slider, { target: { value: '0' } })
    expect(screen.getByTestId('scroll-speed-label')).toHaveTextContent('とても遅い')

    fireEvent.click(screen.getByTestId('start-game-button'))
    expect(onStart.mock.calls[0]![2]).toBe(0.4)
  })

  it('難易度変更でスクロール速度が推奨値にリセットされる', async () => {
    render(<GameSelectScreen onStart={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByTestId('start-game-button')).not.toBeDisabled()
    })

    // デフォルト(intermediate) → ふつう
    expect(screen.getByTestId('scroll-speed-label')).toHaveTextContent('ふつう')

    // 入門に変更 → 遅い (0.6)
    const beginnerRadio = screen.getAllByRole('radio')[0]!
    fireEvent.click(beginnerRadio)
    expect(screen.getByTestId('scroll-speed-label')).toHaveTextContent('遅い')
  })
})
