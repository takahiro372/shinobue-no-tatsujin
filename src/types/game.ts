import type { JudgementType, Difficulty } from './music'
import type { ShinobueRegister } from './shinobue'

export type PitchMeterSize = 'large' | 'small' | 'hidden'

/** 判定結果 */
export interface JudgementResult {
  type: JudgementType
  timingDelta: number  // ms (正=遅い, 負=早い)
  pitchDelta: number   // cents
  noteId: string
}

/** ゲーム用ノート (タイムライン上に配置済み) */
export interface GameNote {
  id: string
  /** 音符開始時刻 (ms) */
  timeMs: number
  /** 音符の長さ (ms) */
  durationMs: number
  /** ピッチ情報 (null = 休符) */
  frequency: number | null
  midiNote: number | null
  shinobueNumber: number | null
  register: ShinobueRegister | null
  western: string | null
  /** 篠笛の音名表示 (呂: 一二三, 甲: 1 2 3, 大甲: 大1 大2) */
  shinobueName: string | null
  /** 判定状態 */
  judgement: JudgementResult | null
  /** 判定済みか */
  judged: boolean
}

/** ゲーム全体の状態 */
export interface GameState {
  status: 'idle' | 'countdown' | 'playing' | 'paused' | 'finished'
  currentTimeMs: number
  score: number
  combo: number
  maxCombo: number
  judgements: JudgementResult[]
  notes: GameNote[]
  /** 次に判定チェックするノートのインデックス */
  nextNoteIndex: number
}

/** ゲーム結果 */
export interface GameResult {
  score: number
  maxCombo: number
  perfectCount: number
  greatCount: number
  goodCount: number
  missCount: number
  totalNotes: number
  accuracy: number  // 0-100%
  rank: 'S' | 'A' | 'B' | 'C' | 'D'
}

/** 難易度設定 */
export interface DifficultyConfig {
  /** スクロール速度係数 */
  scrollSpeed: number
  /** 判定倍率 (1=通常, >1=緩い) */
  judgementScale: number
  /** 運指ガイド表示 */
  showFingering: 'always' | 'next' | 'none'
  /** 音程メーター表示サイズ */
  pitchMeterSize: PitchMeterSize
  /** 装飾音を要求するか */
  requireOrnaments: boolean
  /** 使用を許可する音域 (これ以外の音符は自動パス) */
  allowedRegisters: ShinobueRegister[]
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  beginner: {
    scrollSpeed: 0.6,
    judgementScale: 1.5,
    showFingering: 'always',
    pitchMeterSize: 'large',
    requireOrnaments: false,
    allowedRegisters: ['ro'],
  },
  intermediate: {
    scrollSpeed: 1.0,
    judgementScale: 1.0,
    showFingering: 'always',
    pitchMeterSize: 'large',
    requireOrnaments: false,
    allowedRegisters: ['ro', 'kan'],
  },
  advanced: {
    scrollSpeed: 1.4,
    judgementScale: 0.8,
    showFingering: 'next',
    pitchMeterSize: 'small',
    requireOrnaments: true,
    allowedRegisters: ['ro', 'kan', 'daikan'],
  },
  master: {
    scrollSpeed: 1.8,
    judgementScale: 0.6,
    showFingering: 'none',
    pitchMeterSize: 'hidden',
    requireOrnaments: true,
    allowedRegisters: ['ro', 'kan', 'daikan'],
  },
}
