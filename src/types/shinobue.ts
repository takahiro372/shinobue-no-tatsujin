/** 篠笛の音域（呂・甲・大甲） */
export type ShinobueRegister = 'ro' | 'kan' | 'daikan'

/** 篠笛の調子の定義 */
export interface ShinobueKey {
  name: string
  baseNote: string
  baseFrequency: number
  range: {
    lowest: number
    highest: number
  }
}

/** 篠笛の音 */
export interface ShinobueNote {
  number: number
  register: ShinobueRegister
  fingering: boolean[]
  frequency: number
  western: string
  name: string
}

/** 装飾音・奏法 */
export type OrnamentType =
  | 'uchiyubi'
  | 'suriage'
  | 'surisage'
  | 'yuri'
  | 'muraiki'
  | 'nayashi'
  | 'oshiire'
  | 'kazashi'

/** NoteClassifier の結果 */
export interface ClassifiedNote {
  shinobueNote: ShinobueNote
  centOffset: number
  confidence: number
}
