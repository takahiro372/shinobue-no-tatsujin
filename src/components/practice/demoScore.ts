import { getFingeringChart } from '../../shinobue/FingeringChart'
import type { Score, Measure, NoteEvent, NotePitch } from '../../score/ScoreModel'
import { generateNoteId } from '../../score/ScoreModel'

/**
 * デモ曲を生成する (さくらさくら風の簡易楽譜)
 */
export function createDemoScore(shinobueKey: string): Score {
  const chart = getFingeringChart(shinobueKey)

  function notePitchFromChart(number: number, register: 'ro' | 'kan' | 'daikan'): NotePitch | undefined {
    const note = chart.find((n) => n.number === number && n.register === register)
    if (!note) return undefined
    return {
      shinobueNumber: note.number,
      register: note.register,
      frequency: note.frequency,
      midiNote: Math.round(69 + 12 * Math.log2(note.frequency / 440)),
      western: note.western,
    }
  }

  function makeNote(number: number, register: 'ro' | 'kan' | 'daikan', startBeat: number): NoteEvent {
    return {
      id: generateNoteId(),
      type: 'note',
      pitch: notePitchFromChart(number, register),
      duration: { type: 'quarter', dots: 0 },
      startBeat,
    }
  }

  // さくらさくら風: 六六七 六六七 六七一'七六
  const measures: Measure[] = [
    {
      number: 1,
      notes: [
        makeNote(6, 'ro', 0),
        makeNote(6, 'ro', 1),
        makeNote(7, 'ro', 2),
        makeNote(6, 'ro', 3),
      ],
    },
    {
      number: 2,
      notes: [
        makeNote(6, 'ro', 0),
        makeNote(7, 'ro', 1),
        makeNote(6, 'ro', 2),
        makeNote(7, 'ro', 3),
      ],
    },
    {
      number: 3,
      notes: [
        makeNote(1, 'kan', 0),
        makeNote(7, 'ro', 1),
        makeNote(6, 'ro', 2),
        makeNote(5, 'ro', 3),
      ],
    },
    {
      number: 4,
      notes: [
        makeNote(3, 'ro', 0),
        makeNote(5, 'ro', 1),
        makeNote(6, 'ro', 2),
        makeNote(5, 'ro', 3),
      ],
      barline: 'final',
    },
  ]

  return {
    metadata: {
      title: 'さくらさくら（デモ）',
      composer: '日本民謡',
      shinobueKey,
      tempo: 80,
      timeSignature: [4, 4],
    },
    measures,
  }
}
