import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMetronome } from './metronome'

// 最小限の AudioContext モック
function createMockAudioContext() {
  let time = 0
  const mockOsc = {
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 0 },
  }
  const mockGain = {
    connect: vi.fn(),
    gain: { value: 1, exponentialRampToValueAtTime: vi.fn() },
  }
  return {
    get currentTime() { return time },
    _advanceTime(s: number) { time += s },
    destination: {},
    createOscillator: vi.fn(() => mockOsc),
    createGain: vi.fn(() => mockGain),
    _mockOsc: mockOsc,
    _mockGain: mockGain,
  } as unknown as AudioContext & { _advanceTime: (s: number) => void }
}

describe('metronome', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('外部 AudioContext を使って作成できる', () => {
    const ctx = createMockAudioContext()
    const metro = createMetronome(ctx)
    expect(metro.isRunning()).toBe(false)
  })

  it('start/stop で状態が切り替わる', () => {
    const ctx = createMockAudioContext()
    const metro = createMetronome(ctx)
    metro.start(120)
    expect(metro.isRunning()).toBe(true)
    metro.stop()
    expect(metro.isRunning()).toBe(false)
  })

  it('start 後にスケジューラがクリック音を生成する', () => {
    const ctx = createMockAudioContext()
    const metro = createMetronome(ctx)
    metro.start(120)

    // スケジューラが走る (25ms間隔)
    vi.advanceTimersByTime(50)

    expect(ctx.createOscillator).toHaveBeenCalled()
    expect(ctx.createGain).toHaveBeenCalled()

    metro.stop()
  })

  it('setTempo でテンポを変更できる', () => {
    const ctx = createMockAudioContext()
    const metro = createMetronome(ctx)
    metro.start(80)
    metro.setTempo(160)
    // エラーなく動作することを確認
    vi.advanceTimersByTime(100)
    metro.stop()
  })

  it('onBeat コールバックが呼ばれる', () => {
    const ctx = createMockAudioContext()
    const metro = createMetronome(ctx)
    const beats: number[] = []
    metro.onBeat((b) => beats.push(b))
    metro.start(120)
    vi.advanceTimersByTime(50)
    expect(beats.length).toBeGreaterThan(0)
    expect(beats[0]).toBe(0)
    metro.stop()
  })

  it('stop 後の currentBeat は 0', () => {
    const ctx = createMockAudioContext()
    const metro = createMetronome(ctx)
    metro.start(120)
    vi.advanceTimersByTime(50)
    metro.stop()
    expect(metro.currentBeat()).toBe(0)
  })
})
