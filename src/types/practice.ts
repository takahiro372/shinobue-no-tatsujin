import type { ShinobueRegister } from './shinobue'

/** 練習モード */
export type PracticeMode = 'tuner' | 'longTone' | 'scale' | 'section' | 'dashboard'

// ── ロングトーン ──

export interface LongToneConfig {
  targetNoteNumber: number
  targetRegister: ShinobueRegister
  duration: 5 | 10 | 15 | 30
  toleranceCents: number
}

export interface LongToneResult {
  stability: number       // 0-100%
  averageDeviation: number
  maxDeviation: number
  success: boolean
  timestamp: number
}

// ── 音階練習 ──

export type ScalePattern = 'ascending' | 'descending' | 'skip' | 'random'

export interface ScaleConfig {
  pattern: ScalePattern
  tempo: number           // 60-180 BPM
  metronomeEnabled: boolean
  registerFilter: ShinobueRegister | 'all'
}

export interface ScaleNoteResult {
  expectedNote: string
  actualNote: string | null
  centOffset: number
  isCorrect: boolean
}

export interface ScaleResult {
  accuracy: number        // 0-100%
  noteResults: ScaleNoteResult[]
  averageResponseTimeMs: number
  timestamp: number
}

// ── 区間練習 ──

export interface SectionConfig {
  scoreTitle: string
  startMeasure: number
  endMeasure: number
  tempoScale: number      // 0.5 | 0.75 | 1.0
  loopCount: number
  gradualSpeedUp: boolean
}

export interface SectionResult {
  accuracy: number        // 0-100%
  mistakePositions: number[]
  timestamp: number
}

// ── 記録 ──

export type PracticeResultUnion = LongToneResult | ScaleResult | SectionResult

export interface PracticeRecord {
  id: string
  type: 'longTone' | 'scale' | 'section'
  date: string            // ISO date string (YYYY-MM-DD)
  timestamp: number
  shinobueKey: string
  result: PracticeResultUnion
}

export interface PracticeStats {
  totalSessions: number
  totalPracticeMinutes: number
  streakDays: number
  longToneAverageStability: number
  scaleAverageAccuracy: number
  sectionAverageAccuracy: number
}
