import { describe, it, expect, beforeEach } from 'vitest'
import { exportToMusicXML, exportToShinobueJSON } from './ScoreExporter'
import { parseMusicXML, parseShinobueJSON } from './ScoreParser'
import {
  createEmptyScore,
  createNoteEvent,
  updateMeasure,
  resetNoteIdCounter,
} from './ScoreModel'
import type { Score } from './ScoreModel'

beforeEach(() => {
  resetNoteIdCounter()
})

function createTestScore(): Score {
  let score = createEmptyScore({
    title: 'エクスポートテスト',
    composer: 'テスト作者',
    tempo: 100,
    timeSignature: [4, 4],
    measureCount: 2,
  })

  // 第1小節に音符を追加
  const note1 = createNoteEvent({
    type: 'note',
    pitch: {
      shinobueNumber: 0,
      register: 'ro',
      frequency: 493.88,
      midiNote: 71,
      western: 'B4',
    },
    durationType: 'quarter',
    startBeat: 0,
  })
  const note2 = createNoteEvent({
    type: 'note',
    pitch: {
      shinobueNumber: 1,
      register: 'ro',
      frequency: 554.37,
      midiNote: 73,
      western: 'C#5',
    },
    durationType: 'quarter',
    startBeat: 1,
  })
  const rest = createNoteEvent({
    type: 'rest',
    durationType: 'half',
    startBeat: 2,
  })

  score = updateMeasure(score, 1, (m) => ({
    ...m,
    notes: [note1, note2, rest],
  }))

  return score
}

describe('exportToMusicXML', () => {
  it('有効な XML を出力する', () => {
    const score = createTestScore()
    const xml = exportToMusicXML(score)

    expect(xml).toContain('<?xml version="1.0"')
    expect(xml).toContain('<score-partwise')
    expect(xml).toContain('</score-partwise>')
  })

  it('メタデータが含まれる', () => {
    const score = createTestScore()
    const xml = exportToMusicXML(score)

    expect(xml).toContain('<work-title>エクスポートテスト</work-title>')
    expect(xml).toContain('type="composer">テスト作者</creator>')
    expect(xml).toContain('tempo="100"')
  })

  it('拍子記号が含まれる', () => {
    const score = createTestScore()
    const xml = exportToMusicXML(score)

    expect(xml).toContain('<beats>4</beats>')
    expect(xml).toContain('<beat-type>4</beat-type>')
  })

  it('ピッチ情報が含まれる', () => {
    const score = createTestScore()
    const xml = exportToMusicXML(score)

    expect(xml).toContain('<step>B</step>')
    expect(xml).toContain('<octave>4</octave>')
    expect(xml).toContain('<step>C</step>')
    expect(xml).toContain('<alter>1</alter>') // C#
  })

  it('休符が含まれる', () => {
    const score = createTestScore()
    const xml = exportToMusicXML(score)
    expect(xml).toContain('<rest/>')
  })

  it('音価タイプが含まれる', () => {
    const score = createTestScore()
    const xml = exportToMusicXML(score)
    expect(xml).toContain('<type>quarter</type>')
    expect(xml).toContain('<type>half</type>')
  })

  it('最終小節に final barline が含まれる', () => {
    const score = createTestScore()
    const xml = exportToMusicXML(score)
    expect(xml).toContain('<bar-style>light-heavy</bar-style>')
  })

  it('XMLの特殊文字がエスケープされる', () => {
    const score = createEmptyScore({ title: '<テスト&曲>' })
    const xml = exportToMusicXML(score)
    expect(xml).toContain('&lt;テスト&amp;曲&gt;')
  })
})

describe('MusicXML ラウンドトリップ', () => {
  it('エクスポート → インポートでメタデータが保持される', () => {
    const original = createTestScore()
    const xml = exportToMusicXML(original)
    const imported = parseMusicXML(xml)

    expect(imported.metadata.title).toBe(original.metadata.title)
    expect(imported.metadata.composer).toBe(original.metadata.composer)
    expect(imported.metadata.tempo).toBe(original.metadata.tempo)
    expect(imported.metadata.timeSignature).toEqual(original.metadata.timeSignature)
  })

  it('エクスポート → インポートで小節数が保持される', () => {
    const original = createTestScore()
    const xml = exportToMusicXML(original)
    const imported = parseMusicXML(xml)

    expect(imported.measures.length).toBe(original.measures.length)
  })

  it('エクスポート → インポートで音符タイプが保持される', () => {
    const original = createTestScore()
    const xml = exportToMusicXML(original)
    const imported = parseMusicXML(xml)

    const originalNotes = original.measures[0]!.notes
    const importedNotes = imported.measures[0]!.notes

    expect(importedNotes.length).toBe(originalNotes.length)
    expect(importedNotes[0]!.type).toBe('note')
    expect(importedNotes[1]!.type).toBe('note')
    expect(importedNotes[2]!.type).toBe('rest')
  })

  it('エクスポート → インポートでピッチが保持される', () => {
    const original = createTestScore()
    const xml = exportToMusicXML(original)
    const imported = parseMusicXML(xml)

    const orig = original.measures[0]!.notes[0]!.pitch!
    const imp = imported.measures[0]!.notes[0]!.pitch!

    expect(imp.western).toBe(orig.western)
    expect(imp.midiNote).toBe(orig.midiNote)
  })
})

describe('exportToShinobueJSON', () => {
  it('有効な JSON を出力する', () => {
    const score = createTestScore()
    const json = exportToShinobueJSON(score)
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('メタデータが含まれる', () => {
    const score = createTestScore()
    const json = exportToShinobueJSON(score)
    const parsed = JSON.parse(json)
    expect(parsed.metadata.title).toBe('エクスポートテスト')
  })
})

describe('ShinobueJSON ラウンドトリップ', () => {
  it('エクスポート → インポートで完全に復元される', () => {
    const original = createTestScore()
    const json = exportToShinobueJSON(original)
    const imported = parseShinobueJSON(json)

    expect(imported.metadata).toEqual(original.metadata)
    expect(imported.measures.length).toBe(original.measures.length)

    // 音符の詳細比較
    for (let i = 0; i < original.measures.length; i++) {
      const origNotes = original.measures[i]!.notes
      const impNotes = imported.measures[i]!.notes
      expect(impNotes.length).toBe(origNotes.length)
      for (let j = 0; j < origNotes.length; j++) {
        expect(impNotes[j]!.type).toBe(origNotes[j]!.type)
        expect(impNotes[j]!.duration).toEqual(origNotes[j]!.duration)
        if (origNotes[j]!.pitch) {
          expect(impNotes[j]!.pitch).toEqual(origNotes[j]!.pitch)
        }
      }
    }
  })
})
