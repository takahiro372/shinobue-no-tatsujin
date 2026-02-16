import type { Difficulty, DurationType } from '../types/music'
import type { ShinobueRegister, OrnamentType } from '../types/shinobue'

// ── 型定義 ──

export interface Score {
  metadata: ScoreMetadata
  measures: Measure[]
}

export interface ScoreMetadata {
  title: string
  composer: string
  arranger?: string
  shinobueKey: string
  tempo: number
  timeSignature: [number, number]
  difficulty?: Difficulty
}

export interface Measure {
  number: number
  notes: NoteEvent[]
  barline?: BarlineType
}

export type BarlineType = 'normal' | 'double' | 'final' | 'repeat-start' | 'repeat-end'

export interface NoteEvent {
  id: string
  type: 'note' | 'rest'
  pitch?: NotePitch
  duration: NoteDuration
  startBeat: number
  ornaments?: OrnamentType[]
  tie?: 'start' | 'stop' | 'continue'
  slur?: 'start' | 'stop' | 'continue'
  dynamics?: string
  text?: string
}

export interface NotePitch {
  shinobueNumber: number
  register: ShinobueRegister
  frequency: number
  midiNote: number
  western: string
}

export interface NoteDuration {
  type: DurationType
  dots: number
  tuplet?: number
}

// ── ユーティリティ ──

let _idCounter = 0

/** ユニークIDを生成 */
export function generateNoteId(): string {
  _idCounter++
  return `note-${Date.now()}-${_idCounter}`
}

/** テスト用: IDカウンタをリセット */
export function resetNoteIdCounter(): void {
  _idCounter = 0
}

/** 音価タイプから拍数(四分音符=1)を取得 */
export function durationToBeats(duration: NoteDuration): number {
  const baseBeats: Record<DurationType, number> = {
    whole: 4,
    half: 2,
    quarter: 1,
    eighth: 0.5,
    sixteenth: 0.25,
    'thirty-second': 0.125,
  }

  let beats = baseBeats[duration.type]

  // 付点処理
  let dotValue = beats
  for (let i = 0; i < duration.dots; i++) {
    dotValue /= 2
    beats += dotValue
  }

  // 三連符処理
  if (duration.tuplet && duration.tuplet > 0) {
    beats = (beats * 2) / duration.tuplet
  }

  return beats
}

/** 拍子記号から1小節の総拍数を計算 */
export function beatsPerMeasure(timeSignature: [number, number]): number {
  const [numerator, denominator] = timeSignature
  // 分母を四分音符基準に変換
  return numerator * (4 / denominator)
}

/** 空の楽譜を作成 */
export function createEmptyScore(options: {
  title?: string
  composer?: string
  shinobueKey?: string
  tempo?: number
  timeSignature?: [number, number]
  measureCount?: number
} = {}): Score {
  const {
    title = '無題',
    composer = '',
    shinobueKey = 'nana',
    tempo = 80,
    timeSignature = [4, 4] as [number, number],
    measureCount = 4,
  } = options

  const measures: Measure[] = []

  for (let i = 0; i < measureCount; i++) {
    measures.push({
      number: i + 1,
      notes: [
        {
          id: generateNoteId(),
          type: 'rest',
          duration: { type: 'whole', dots: 0 },
          startBeat: 0,
        },
      ],
      barline: i === measureCount - 1 ? 'final' : 'normal',
    })
  }

  return {
    metadata: { title, composer, shinobueKey, tempo, timeSignature },
    measures,
  }
}

/** 小節に音符を追加 */
export function addNoteToMeasure(measure: Measure, note: NoteEvent): Measure {
  const notes = [...measure.notes, note].sort((a, b) => a.startBeat - b.startBeat)
  return { ...measure, notes }
}

/** 小節から音符を削除 */
export function removeNoteFromMeasure(measure: Measure, noteId: string): Measure {
  return { ...measure, notes: measure.notes.filter((n) => n.id !== noteId) }
}

/** 楽譜の特定小節を更新 */
export function updateMeasure(score: Score, measureNumber: number, updater: (m: Measure) => Measure): Score {
  return {
    ...score,
    measures: score.measures.map((m) =>
      m.number === measureNumber ? updater(m) : m,
    ),
  }
}

/** 楽譜の末尾に小節を追加 */
export function appendMeasure(score: Score): Score {
  const lastNumber = score.measures.length > 0
    ? score.measures[score.measures.length - 1]!.number
    : 0

  // 既存の最終小節の barline を normal に変更
  const updatedMeasures = score.measures.map((m, i) =>
    i === score.measures.length - 1 ? { ...m, barline: 'normal' as BarlineType } : m,
  )

  const newMeasure: Measure = {
    number: lastNumber + 1,
    notes: [
      {
        id: generateNoteId(),
        type: 'rest',
        duration: { type: 'whole', dots: 0 },
        startBeat: 0,
      },
    ],
    barline: 'final',
  }

  return { ...score, measures: [...updatedMeasures, newMeasure] }
}

/** 楽譜から小節を削除 */
export function removeMeasure(score: Score, measureNumber: number): Score {
  const measures = score.measures
    .filter((m) => m.number !== measureNumber)
    .map((m, i) => ({ ...m, number: i + 1 }))

  // 最後の小節を final に
  if (measures.length > 0) {
    measures[measures.length - 1] = {
      ...measures[measures.length - 1]!,
      barline: 'final',
    }
  }

  return { ...score, measures }
}

/** 楽譜の総拍数を計算 */
export function totalBeats(score: Score): number {
  return score.measures.length * beatsPerMeasure(score.metadata.timeSignature)
}

/** 楽譜の総演奏時間(秒)を計算 */
export function totalDurationSeconds(score: Score): number {
  const beats = totalBeats(score)
  return (beats / score.metadata.tempo) * 60
}

/** 音符のNoteEventを作成するヘルパー */
export function createNoteEvent(options: {
  type?: 'note' | 'rest'
  pitch?: NotePitch
  durationType?: DurationType
  dots?: number
  startBeat: number
  tuplet?: number
}): NoteEvent {
  return {
    id: generateNoteId(),
    type: options.type ?? 'note',
    pitch: options.pitch,
    duration: {
      type: options.durationType ?? 'quarter',
      dots: options.dots ?? 0,
      tuplet: options.tuplet,
    },
    startBeat: options.startBeat,
  }
}

/** MIDIノート番号から音名を取得する簡易関数 */
export function midiToWestern(midiNote: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midiNote / 12) - 1
  const noteIndex = ((midiNote % 12) + 12) % 12
  return `${noteNames[noteIndex]}${octave}`
}
