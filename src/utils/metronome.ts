/**
 * メトロノーム
 *
 * Web Audio API の OscillatorNode でクリック音を生成する。
 * lookahead スケジューリングで正確なタイミングを実現。
 */

export interface Metronome {
  start: (bpm: number) => void
  stop: () => void
  setTempo: (bpm: number) => void
  isRunning: () => boolean
  /** 現在のビート番号 (0-indexed) */
  currentBeat: () => number
  /** ビートコールバック */
  onBeat: (cb: (beat: number) => void) => void
}

const LOOKAHEAD_MS = 25       // スケジューラの呼び出し間隔 (ms)
const SCHEDULE_AHEAD_S = 0.1  // 先読みスケジュール時間 (秒)
const CLICK_FREQ = 880        // 通常ビート周波数 (Hz)
const ACCENT_FREQ = 1320      // アクセントビート周波数 (Hz)
const CLICK_DURATION = 0.05   // クリック音の長さ (秒)

export function createMetronome(audioContext?: AudioContext): Metronome {
  let ctx = audioContext ?? null
  let running = false
  let bpm = 80
  let nextNoteTime = 0
  let beat = 0
  let timerId: ReturnType<typeof setInterval> | null = null
  let beatCallback: ((beat: number) => void) | null = null

  function scheduleClick(time: number, isAccent: boolean): void {
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.frequency.value = isAccent ? ACCENT_FREQ : CLICK_FREQ
    gain.gain.value = isAccent ? 0.8 : 0.5

    osc.start(time)
    osc.stop(time + CLICK_DURATION)
    gain.gain.exponentialRampToValueAtTime(0.001, time + CLICK_DURATION)
  }

  function scheduler(): void {
    if (!ctx) return
    while (nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD_S) {
      const isAccent = beat % 4 === 0
      scheduleClick(nextNoteTime, isAccent)
      beatCallback?.(beat)

      const secondsPerBeat = 60.0 / bpm
      nextNoteTime += secondsPerBeat
      beat++
    }
  }

  return {
    start(newBpm: number) {
      if (running) return
      bpm = newBpm
      if (!ctx) {
        ctx = new AudioContext()
      }
      running = true
      beat = 0
      nextNoteTime = ctx.currentTime + 0.05
      timerId = setInterval(scheduler, LOOKAHEAD_MS)
    },

    stop() {
      running = false
      if (timerId !== null) {
        clearInterval(timerId)
        timerId = null
      }
      beat = 0
    },

    setTempo(newBpm: number) {
      bpm = newBpm
    },

    isRunning() {
      return running
    },

    currentBeat() {
      return beat
    },

    onBeat(cb: (beat: number) => void) {
      beatCallback = cb
    },
  }
}
