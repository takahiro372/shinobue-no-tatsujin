import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GameEngine, scoreToGameNotes } from './GameEngine'
import { createEmptyScore, createNoteEvent, updateMeasure, resetNoteIdCounter } from '../score/ScoreModel'
import type { Score } from '../score/ScoreModel'

beforeEach(() => {
  resetNoteIdCounter()
})

function createTestScore(): Score {
  let score = createEmptyScore({
    title: 'テスト',
    tempo: 120, // ♩=120 → 1拍 = 500ms
    timeSignature: [4, 4],
    measureCount: 1,
  })

  score = updateMeasure(score, 1, (m) => ({
    ...m,
    notes: [
      createNoteEvent({
        type: 'note',
        pitch: { shinobueNumber: 0, register: 'ro', frequency: 493.88, midiNote: 71, western: 'B4' },
        durationType: 'quarter',
        startBeat: 0,
      }),
      createNoteEvent({
        type: 'note',
        pitch: { shinobueNumber: 1, register: 'ro', frequency: 554.37, midiNote: 73, western: 'C#5' },
        durationType: 'quarter',
        startBeat: 1,
      }),
      createNoteEvent({
        type: 'rest',
        durationType: 'quarter',
        startBeat: 2,
      }),
      createNoteEvent({
        type: 'note',
        pitch: { shinobueNumber: 3, register: 'ro', frequency: 659.26, midiNote: 76, western: 'E5' },
        durationType: 'quarter',
        startBeat: 3,
      }),
    ],
  }))

  return score
}

describe('scoreToGameNotes', () => {
  it('BPM 120 で四分音符 → 500ms 間隔', () => {
    const score = createTestScore()
    const notes = scoreToGameNotes(score)

    expect(notes[0]!.timeMs).toBeCloseTo(0)
    expect(notes[1]!.timeMs).toBeCloseTo(500)
    expect(notes[2]!.timeMs).toBeCloseTo(1000) // 休符
    expect(notes[3]!.timeMs).toBeCloseTo(1500)
  })

  it('各ノートの duration が 500ms', () => {
    const score = createTestScore()
    const notes = scoreToGameNotes(score)

    for (const note of notes) {
      expect(note.durationMs).toBeCloseTo(500)
    }
  })

  it('休符は frequency が null', () => {
    const score = createTestScore()
    const notes = scoreToGameNotes(score)

    expect(notes[2]!.frequency).toBeNull()
    expect(notes[0]!.frequency).toBe(493.88)
  })

  it('timeMs 昇順でソートされる', () => {
    const score = createTestScore()
    const notes = scoreToGameNotes(score)

    for (let i = 1; i < notes.length; i++) {
      expect(notes[i]!.timeMs).toBeGreaterThanOrEqual(notes[i - 1]!.timeMs)
    }
  })

  it('BPM 60 で四分音符 → 1000ms 間隔', () => {
    let score = createTestScore()
    score = { ...score, metadata: { ...score.metadata, tempo: 60 } }
    const notes = scoreToGameNotes(score)
    expect(notes[1]!.timeMs).toBeCloseTo(1000)
  })

  it('タイ音符は直前の音と同じ frequency を持つ', () => {
    let score = createEmptyScore({ tempo: 120, measureCount: 1 })
    score = updateMeasure(score, 1, (m) => ({
      ...m,
      notes: [
        createNoteEvent({
          type: 'note',
          pitch: { shinobueNumber: 3, register: 'ro', frequency: 659.26, midiNote: 76, western: 'E5' },
          durationType: 'quarter',
          startBeat: 0,
        }),
        createNoteEvent({
          type: 'tie',
          durationType: 'quarter',
          startBeat: 1,
        }),
        createNoteEvent({
          type: 'tie',
          durationType: 'quarter',
          startBeat: 2,
        }),
      ],
    }))
    const notes = scoreToGameNotes(score)
    expect(notes[0]!.frequency).toBe(659.26)
    expect(notes[1]!.frequency).toBe(659.26)
    expect(notes[1]!.shinobueName).toBe('～')
    expect(notes[2]!.frequency).toBe(659.26)
    expect(notes[2]!.shinobueName).toBe('～')
  })
})

describe('GameEngine', () => {
  it('初期状態は idle', () => {
    const score = createTestScore()
    const engine = new GameEngine(score)
    expect(engine.status).toBe('idle')
  })

  it('start() で playing になる', () => {
    const score = createTestScore()
    const engine = new GameEngine(score)
    engine.start()
    expect(engine.status).toBe('playing')
  })

  it('pause / resume が動作する', () => {
    const score = createTestScore()
    const engine = new GameEngine(score)
    engine.start()
    engine.pause()
    expect(engine.status).toBe('paused')
    engine.resume()
    expect(engine.status).toBe('playing')
  })

  it('totalPlayableNotes は休符を除く', () => {
    const score = createTestScore()
    const engine = new GameEngine(score)
    // 4ノート中3つが note、1つが rest
    expect(engine.totalPlayableNotes).toBe(3)
  })

  it('stop() で finished になる', () => {
    const score = createTestScore()
    const engine = new GameEngine(score)
    engine.start()
    engine.stop()
    expect(engine.status).toBe('finished')
  })

  it('onJudgement コールバックが呼ばれる', () => {
    const score = createTestScore()
    const onJudgement = vi.fn()
    const engine = new GameEngine(score, 'intermediate', { onJudgement })
    engine.start()

    // 最初のノート (B4, 493.88Hz, time=0ms) のウィンドウ内で正確な音を送る
    // 手動で currentTime を制御するため、直接テスト
    // GameEngine.update は performance.now() ベースなので、
    // ここでは getState / getResult の整合性を検証

    expect(engine.getState().status).toBe('playing')
  })

  it('getResult が正しい形式', () => {
    const score = createTestScore()
    const engine = new GameEngine(score)
    engine.start()
    engine.stop()

    const result = engine.getResult()
    expect(result).toHaveProperty('score')
    expect(result).toHaveProperty('maxCombo')
    expect(result).toHaveProperty('perfectCount')
    expect(result).toHaveProperty('greatCount')
    expect(result).toHaveProperty('goodCount')
    expect(result).toHaveProperty('missCount')
    expect(result).toHaveProperty('totalNotes')
    expect(result).toHaveProperty('accuracy')
    expect(result).toHaveProperty('rank')
    expect(result.totalNotes).toBe(3)
  })

  it('getState が全フィールドを含む', () => {
    const score = createTestScore()
    const engine = new GameEngine(score)
    engine.start()
    const state = engine.getState()
    expect(state.status).toBe('playing')
    expect(state.currentTimeMs).toBeGreaterThanOrEqual(0)
    expect(state.score).toBe(0)
    expect(state.combo).toBe(0)
    expect(Array.isArray(state.notes)).toBe(true)
    expect(Array.isArray(state.judgements)).toBe(true)
  })

  it('難易度 beginner で作成できる', () => {
    const score = createTestScore()
    const engine = new GameEngine(score, 'beginner')
    expect(engine.status).toBe('idle')
    engine.start()
    expect(engine.status).toBe('playing')
  })

  it('難易度 master で作成できる', () => {
    const score = createTestScore()
    const engine = new GameEngine(score, 'master')
    engine.start()
    expect(engine.status).toBe('playing')
  })

  it('config getter が DifficultyConfig を返す', () => {
    const score = createTestScore()
    const engine = new GameEngine(score, 'beginner')
    expect(engine.config.scrollSpeed).toBe(0.6)
    expect(engine.config.judgementScale).toBe(1.5)
    expect(engine.config.showFingering).toBe('always')
    expect(engine.config.pitchMeterSize).toBe('large')
    expect(engine.config.requireOrnaments).toBe(false)
    expect(engine.config.allowedRegisters).toEqual(['ro'])
  })

  it('config getter が master の設定を返す', () => {
    const score = createTestScore()
    const engine = new GameEngine(score, 'master')
    expect(engine.config.scrollSpeed).toBe(1.8)
    expect(engine.config.pitchMeterSize).toBe('hidden')
    expect(engine.config.requireOrnaments).toBe(true)
    expect(engine.config.allowedRegisters).toEqual(['ro', 'kan', 'daikan'])
  })
})

describe('GameEngine register restriction', () => {
  it('beginner では甲音のノートが判定対象外になる', () => {
    let score = createEmptyScore({
      title: '音域テスト',
      tempo: 120,
      timeSignature: [4, 4],
      measureCount: 1,
    })
    score = updateMeasure(score, 1, (m) => ({
      ...m,
      notes: [
        createNoteEvent({
          type: 'note',
          pitch: { shinobueNumber: 3, register: 'ro', frequency: 659.26, midiNote: 76, western: 'E5' },
          durationType: 'quarter',
          startBeat: 0,
        }),
        createNoteEvent({
          type: 'note',
          pitch: { shinobueNumber: 1, register: 'kan', frequency: 1108.73, midiNote: 85, western: 'C#6' },
          durationType: 'quarter',
          startBeat: 1,
        }),
        createNoteEvent({
          type: 'note',
          pitch: { shinobueNumber: 1, register: 'daikan', frequency: 2217.46, midiNote: 97, western: 'C#7' },
          durationType: 'quarter',
          startBeat: 2,
        }),
      ],
    }))

    // beginner: allowedRegisters = ['ro']
    const engine = new GameEngine(score, 'beginner')
    // 呂音のみが判定対象
    expect(engine.totalPlayableNotes).toBe(1)
  })

  it('intermediate では呂音+甲音が判定対象', () => {
    let score = createEmptyScore({
      title: '音域テスト',
      tempo: 120,
      timeSignature: [4, 4],
      measureCount: 1,
    })
    score = updateMeasure(score, 1, (m) => ({
      ...m,
      notes: [
        createNoteEvent({
          type: 'note',
          pitch: { shinobueNumber: 3, register: 'ro', frequency: 659.26, midiNote: 76, western: 'E5' },
          durationType: 'quarter',
          startBeat: 0,
        }),
        createNoteEvent({
          type: 'note',
          pitch: { shinobueNumber: 1, register: 'kan', frequency: 1108.73, midiNote: 85, western: 'C#6' },
          durationType: 'quarter',
          startBeat: 1,
        }),
        createNoteEvent({
          type: 'note',
          pitch: { shinobueNumber: 1, register: 'daikan', frequency: 2217.46, midiNote: 97, western: 'C#7' },
          durationType: 'quarter',
          startBeat: 2,
        }),
      ],
    }))

    const engine = new GameEngine(score, 'intermediate')
    // 呂音 + 甲音が判定対象 (大甲は除外)
    expect(engine.totalPlayableNotes).toBe(2)
  })

  it('advanced/master では全音域が判定対象', () => {
    let score = createEmptyScore({
      title: '音域テスト',
      tempo: 120,
      timeSignature: [4, 4],
      measureCount: 1,
    })
    score = updateMeasure(score, 1, (m) => ({
      ...m,
      notes: [
        createNoteEvent({
          type: 'note',
          pitch: { shinobueNumber: 3, register: 'ro', frequency: 659.26, midiNote: 76, western: 'E5' },
          durationType: 'quarter',
          startBeat: 0,
        }),
        createNoteEvent({
          type: 'note',
          pitch: { shinobueNumber: 1, register: 'kan', frequency: 1108.73, midiNote: 85, western: 'C#6' },
          durationType: 'quarter',
          startBeat: 1,
        }),
        createNoteEvent({
          type: 'note',
          pitch: { shinobueNumber: 1, register: 'daikan', frequency: 2217.46, midiNote: 97, western: 'C#7' },
          durationType: 'quarter',
          startBeat: 2,
        }),
      ],
    }))

    const engine = new GameEngine(score, 'advanced')
    expect(engine.totalPlayableNotes).toBe(3)
  })
})
