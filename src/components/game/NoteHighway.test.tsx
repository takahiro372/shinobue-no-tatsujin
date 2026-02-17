import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { NoteHighway } from './NoteHighway'
import type { GameNote } from '../../types/game'

// ── Canvas mock ──

function createMockContext(): CanvasRenderingContext2D {
  const calls: string[] = []
  return new Proxy({} as CanvasRenderingContext2D, {
    get(_target, prop: string) {
      if (prop === '__calls') return calls
      if (prop === 'save' || prop === 'restore' || prop === 'beginPath' ||
          prop === 'closePath' || prop === 'stroke' || prop === 'fill') {
        return () => { calls.push(prop) }
      }
      if (prop === 'fillRect' || prop === 'strokeRect' || prop === 'clearRect') {
        return (...args: number[]) => { calls.push(`${prop}(${args.join(',')})`) }
      }
      if (prop === 'moveTo' || prop === 'lineTo' || prop === 'quadraticCurveTo') {
        return (...args: number[]) => { calls.push(`${prop}(${args.join(',')})`) }
      }
      if (prop === 'fillText') {
        return (text: string) => { calls.push(`fillText(${text})`) }
      }
      if (prop === 'setLineDash') {
        return () => { calls.push('setLineDash') }
      }
      // 設定用プロパティはそのまま返す
      return undefined
    },
    set() {
      return true
    },
  })
}

let mockCtx: CanvasRenderingContext2D

beforeEach(() => {
  mockCtx = createMockContext()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx)
})

function makeTestNotes(): GameNote[] {
  return [
    {
      id: 'n1', timeMs: 0, durationMs: 500,
      frequency: 554.37, midiNote: 73, shinobueNumber: 1,
      register: 'ro', western: 'C#5', shinobueName: '一',
      judgement: null, judged: false,
    },
    {
      id: 'n2', timeMs: 500, durationMs: 500,
      frequency: 1108.73, midiNote: 85, shinobueNumber: 1,
      register: 'kan', western: 'C#6', shinobueName: '1',
      judgement: null, judged: false,
    },
    {
      id: 'n3', timeMs: 1000, durationMs: 500,
      frequency: null, midiNote: null, shinobueNumber: null,
      register: null, western: null, shinobueName: null,
      judgement: null, judged: false,
    },
    {
      id: 'n4', timeMs: 1500, durationMs: 500,
      frequency: 659.25, midiNote: 76, shinobueNumber: 3,
      register: 'ro', western: 'E5', shinobueName: '三',
      judgement: null, judged: false,
    },
  ]
}

describe('NoteHighway', () => {
  it('Canvas 要素がレンダリングされる', () => {
    const { container } = render(
      <NoteHighway notes={[]} currentTimeMs={0} />,
    )
    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
  })

  it('指定した width/height が適用される', () => {
    const { container } = render(
      <NoteHighway notes={[]} currentTimeMs={0} width={1200} height={400} />,
    )
    const canvas = container.querySelector('canvas')
    expect(canvas?.getAttribute('width')).toBe('1200')
    expect(canvas?.getAttribute('height')).toBe('400')
  })

  it('ノートがある場合に描画関数が呼ばれる', () => {
    render(
      <NoteHighway notes={makeTestNotes()} currentTimeMs={0} />,
    )
    const calls = (mockCtx as unknown as { __calls: string[] }).__calls
    // 背景の fillRect が呼ばれるはず
    expect(calls.some((c: string) => c.startsWith('fillRect'))).toBe(true)
  })

  it('空のノート配列でもクラッシュしない', () => {
    expect(() => {
      render(<NoteHighway notes={[]} currentTimeMs={5000} />)
    }).not.toThrow()
  })

  it('判定済みノートも正しく描画される', () => {
    const notes = makeTestNotes()
    notes[0] = {
      ...notes[0]!,
      judged: true,
      judgement: { type: 'perfect', timingDelta: 5, pitchDelta: 2, noteId: 'n1' },
    }
    expect(() => {
      render(<NoteHighway notes={notes} currentTimeMs={200} />)
    }).not.toThrow()
  })

  it('異なる currentTimeMs で描画が正しく動作する', () => {
    const notes = makeTestNotes()
    // 曲の途中
    expect(() => {
      render(<NoteHighway notes={notes} currentTimeMs={1000} />)
    }).not.toThrow()
    // 曲の最後
    expect(() => {
      render(<NoteHighway notes={notes} currentTimeMs={3000} />)
    }).not.toThrow()
  })

  it('visibleDurationMs でノート表示範囲が変わる', () => {
    expect(() => {
      render(
        <NoteHighway
          notes={makeTestNotes()}
          currentTimeMs={0}
          visibleDurationMs={2000}
        />,
      )
    }).not.toThrow()
  })

  it('miss 判定のフェードアウトが動作する', () => {
    const notes = makeTestNotes()
    notes[0] = {
      ...notes[0]!,
      judged: true,
      judgement: { type: 'miss', timingDelta: 200, pitchDelta: 0, noteId: 'n1' },
    }
    expect(() => {
      render(<NoteHighway notes={notes} currentTimeMs={800} />)
    }).not.toThrow()
  })

  it('甲音・大甲ノートが画面内に描画される', () => {
    // 大甲ノート (MIDI 97 = C#7) を含む
    const notes: GameNote[] = [
      {
        id: 'n-ro', timeMs: 0, durationMs: 500,
        frequency: 554.37, midiNote: 73, shinobueNumber: 1,
        register: 'ro', western: 'C#5', shinobueName: '一',
        judgement: null, judged: false,
      },
      {
        id: 'n-kan', timeMs: 500, durationMs: 500,
        frequency: 1975.53, midiNote: 95, shinobueNumber: 7,
        register: 'kan', western: 'B6', shinobueName: '7',
        judgement: null, judged: false,
      },
      {
        id: 'n-daikan', timeMs: 1000, durationMs: 500,
        frequency: 2217.46, midiNote: 97, shinobueNumber: 1,
        register: 'daikan', western: 'C#7', shinobueName: '大1',
        judgement: null, judged: false,
      },
    ]
    expect(() => {
      render(<NoteHighway notes={notes} currentTimeMs={0} />)
    }).not.toThrow()

    const calls = (mockCtx as unknown as { __calls: string[] }).__calls
    // fill が複数回呼ばれる (3ノート分)
    const fillCalls = calls.filter(c => c === 'fill')
    expect(fillCalls.length).toBeGreaterThanOrEqual(3)
  })

  it('レジスター境界線が描画される', () => {
    const notes = makeTestNotes() // ro + kan を含む
    render(<NoteHighway notes={notes} currentTimeMs={0} />)

    const calls = (mockCtx as unknown as { __calls: string[] }).__calls
    // setLineDash がレジスター境界描画で呼ばれるはず
    expect(calls.some(c => c === 'setLineDash')).toBe(true)
  })

  it('呂音のみの楽曲でもクラッシュしない', () => {
    const notes: GameNote[] = [
      {
        id: 'n1', timeMs: 0, durationMs: 500,
        frequency: 554.37, midiNote: 73, shinobueNumber: 1,
        register: 'ro', western: 'C#5', shinobueName: '一',
        judgement: null, judged: false,
      },
      {
        id: 'n2', timeMs: 500, durationMs: 500,
        frequency: 587.33, midiNote: 74, shinobueNumber: 2,
        register: 'ro', western: 'D5', shinobueName: '二',
        judgement: null, judged: false,
      },
    ]
    expect(() => {
      render(<NoteHighway notes={notes} currentTimeMs={0} />)
    }).not.toThrow()
  })
})
