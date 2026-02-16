import { describe, it, expect, beforeEach } from 'vitest'
import { renderScore, calculateCanvasHeight } from './ScoreRenderer'
import { createEmptyScore, createNoteEvent, resetNoteIdCounter } from './ScoreModel'
import type { Score } from './ScoreModel'

// jsdom は CanvasRenderingContext2D を完全にサポートしないため、
// モック ctx を使ってクラッシュしないことと基本的な呼び出しを検証する

function createMockCtx(): CanvasRenderingContext2D {
  const calls: string[] = []
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === '_calls') return calls
      if (prop === 'canvas') return { width: 800, height: 600 }
      return (...args: unknown[]) => {
        calls.push(`${String(prop)}(${args.length} args)`)
      }
    },
    set() {
      return true
    },
  }
  return new Proxy({}, handler) as unknown as CanvasRenderingContext2D
}

beforeEach(() => {
  resetNoteIdCounter()
})

function createTestScore(): Score {
  const score = createEmptyScore({ title: 'テスト', measureCount: 2 })
  // 第1小節に四分音符を追加
  score.measures[0]!.notes = [
    createNoteEvent({
      type: 'note',
      pitch: {
        shinobueNumber: 3,
        register: 'ro',
        frequency: 659.26,
        midiNote: 64,
        western: 'E5',
      },
      durationType: 'quarter',
      startBeat: 0,
    }),
    createNoteEvent({
      type: 'note',
      pitch: {
        shinobueNumber: 5,
        register: 'ro',
        frequency: 783.99,
        midiNote: 67,
        western: 'G5',
      },
      durationType: 'quarter',
      startBeat: 1,
    }),
    createNoteEvent({ type: 'rest', durationType: 'half', startBeat: 2 }),
  ]
  return score
}

describe('renderScore', () => {
  it('number モードでクラッシュしない', () => {
    const ctx = createMockCtx()
    const score = createTestScore()
    expect(() => {
      renderScore(ctx, score, { mode: 'number', width: 800, height: 400 })
    }).not.toThrow()
  })

  it('western モードでクラッシュしない', () => {
    const ctx = createMockCtx()
    const score = createTestScore()
    expect(() => {
      renderScore(ctx, score, { mode: 'western', width: 800, height: 400 })
    }).not.toThrow()
  })

  it('both モードでクラッシュしない', () => {
    const ctx = createMockCtx()
    const score = createTestScore()
    expect(() => {
      renderScore(ctx, score, { mode: 'both', width: 800, height: 600 })
    }).not.toThrow()
  })

  it('空の楽譜でクラッシュしない', () => {
    const ctx = createMockCtx()
    const score = createEmptyScore({ measureCount: 1 })
    expect(() => {
      renderScore(ctx, score, { mode: 'number' })
    }).not.toThrow()
  })

  it('highlightNoteId を渡してもクラッシュしない', () => {
    const ctx = createMockCtx()
    const score = createTestScore()
    const noteId = score.measures[0]!.notes[0]!.id
    expect(() => {
      renderScore(ctx, score, { mode: 'number', highlightNoteId: noteId })
    }).not.toThrow()
  })
})

describe('calculateCanvasHeight', () => {
  it('number モードで正の高さを返す', () => {
    const score = createTestScore()
    const height = calculateCanvasHeight(score, { mode: 'number' })
    expect(height).toBeGreaterThan(0)
  })

  it('western モードで正の高さを返す', () => {
    const score = createTestScore()
    const height = calculateCanvasHeight(score, { mode: 'western' })
    expect(height).toBeGreaterThan(0)
  })

  it('both モードが western より高い', () => {
    const score = createTestScore()
    const western = calculateCanvasHeight(score, { mode: 'western' })
    const both = calculateCanvasHeight(score, { mode: 'both' })
    expect(both).toBeGreaterThan(western)
  })

  it('小節数が増えると高さも増える', () => {
    const small = createEmptyScore({ measureCount: 1 })
    const large = createEmptyScore({ measureCount: 20 })
    // 大きいスコアは多くの音符を持つ
    for (let i = 0; i < 18; i++) {
      large.measures[i]!.notes = [
        createNoteEvent({ startBeat: 0 }),
        createNoteEvent({ startBeat: 1 }),
        createNoteEvent({ startBeat: 2 }),
        createNoteEvent({ startBeat: 3 }),
      ]
    }
    const h1 = calculateCanvasHeight(small, { mode: 'number', notesPerRow: 8 })
    const h2 = calculateCanvasHeight(large, { mode: 'number', notesPerRow: 8 })
    expect(h2).toBeGreaterThan(h1)
  })
})
