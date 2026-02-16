/** 音程検出結果 */
export interface PitchResult {
  frequency: number
  confidence: number
  noteNumber: number
  noteName: string
  centOffset: number
  timestamp: number
}

/** 音符の長さ */
export type DurationType =
  | 'whole'
  | 'half'
  | 'quarter'
  | 'eighth'
  | 'sixteenth'
  | 'thirty-second'

/** 判定結果 */
export type JudgementType = 'perfect' | 'great' | 'good' | 'miss'

/** 難易度 */
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'master'
