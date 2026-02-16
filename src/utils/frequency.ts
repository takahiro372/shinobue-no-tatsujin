/**
 * 周波数ユーティリティ
 *
 * A4 = 440Hz を基準とした音名・MIDI番号・周波数の相互変換
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

/**
 * 周波数からMIDIノート番号を計算
 * A4 (440Hz) = MIDI 69
 */
export function frequencyToMidiNote(frequency: number, tuningA4 = 440): number {
  return 69 + 12 * Math.log2(frequency / tuningA4)
}

/**
 * MIDIノート番号から周波数を計算
 */
export function midiNoteToFrequency(midiNote: number, tuningA4 = 440): number {
  return tuningA4 * Math.pow(2, (midiNote - 69) / 12)
}

/**
 * MIDIノート番号から音名を取得
 * 例: 69 → "A4", 60 → "C4"
 */
export function midiNoteToName(midiNote: number): string {
  const rounded = Math.round(midiNote)
  const octave = Math.floor(rounded / 12) - 1
  const noteIndex = ((rounded % 12) + 12) % 12
  return `${NOTE_NAMES[noteIndex]}${octave}`
}

/**
 * 周波数から最も近い音名を取得
 */
export function frequencyToNoteName(frequency: number, tuningA4 = 440): string {
  const midiNote = frequencyToMidiNote(frequency, tuningA4)
  return midiNoteToName(midiNote)
}

/**
 * 周波数から最も近い半音までのセント偏差を計算
 * 範囲: -50 ~ +50 cents
 */
export function frequencyCentOffset(frequency: number, tuningA4 = 440): number {
  const midiNote = frequencyToMidiNote(frequency, tuningA4)
  const rounded = Math.round(midiNote)
  return (midiNote - rounded) * 100
}

/**
 * 2つの周波数間のセント差を計算
 */
export function centsBetween(f1: number, f2: number): number {
  return 1200 * Math.log2(f1 / f2)
}
