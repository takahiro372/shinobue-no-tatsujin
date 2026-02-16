import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScoreEditor } from './useScoreEditor'
import { createEmptyScore, resetNoteIdCounter } from '../score/ScoreModel'

beforeEach(() => {
  resetNoteIdCounter()
})

const testPitch = {
  shinobueNumber: 3,
  register: 'ro' as const,
  frequency: 659,
  midiNote: 64,
  western: 'E5',
}

describe('useScoreEditor', () => {
  it('デフォルトの楽譜で初期化される', () => {
    const { result } = renderHook(() => useScoreEditor())
    expect(result.current.score.metadata.title).toBe('無題')
    expect(result.current.score.measures).toHaveLength(4)
    expect(result.current.selectedNoteId).toBeNull()
    expect(result.current.currentDuration).toBe('quarter')
    expect(result.current.isDirty).toBe(false)
    expect(result.current.savedSongId).toBeNull()
  })

  it('初期スコアを渡せる', () => {
    const initial = createEmptyScore({ title: 'テスト曲', measureCount: 2 })
    const { result } = renderHook(() => useScoreEditor(initial))
    expect(result.current.score.metadata.title).toBe('テスト曲')
    expect(result.current.score.measures).toHaveLength(2)
  })

  it('音符を追加できる', () => {
    const { result } = renderHook(() => useScoreEditor())

    act(() => {
      result.current.addNote(1, testPitch, 0, 'note')
    })

    const measure = result.current.score.measures[0]!
    expect(measure.notes.length).toBeGreaterThanOrEqual(2)
    const addedNote = measure.notes.find((n) => n.type === 'note')
    expect(addedNote).toBeDefined()
    expect(addedNote!.pitch!.western).toBe('E5')
    expect(result.current.isDirty).toBe(true)
  })

  it('音符を削除すると小節から完全に除去される', () => {
    const { result } = renderHook(() => useScoreEditor())

    let noteId: string
    act(() => {
      noteId = result.current.addNote(1, testPitch, 0, 'note')
    })

    const beforeCount = result.current.score.measures[0]!.notes.length

    act(() => {
      result.current.deleteNote(1, noteId!)
    })

    const afterCount = result.current.score.measures[0]!.notes.length
    expect(afterCount).toBe(beforeCount - 1)
    const deleted = result.current.score.measures[0]!.notes.find((n) => n.id === noteId!)
    expect(deleted).toBeUndefined()
  })

  it('削除後に後続の音符の startBeat が詰まる', () => {
    const { result } = renderHook(() => useScoreEditor())

    // 初期の全休符を削除して空にする
    const initialNote = result.current.score.measures[0]!.notes[0]!
    act(() => {
      result.current.deleteNote(1, initialNote.id)
    })

    const pitch2 = { ...testPitch, shinobueNumber: 5 }

    let id1: string
    let id2: string
    act(() => {
      id1 = result.current.addNote(1, testPitch, 0, 'note')
    })
    act(() => {
      id2 = result.current.addNote(1, pitch2, 1, 'note')
    })

    // id1 を削除 → id2 の startBeat が 0 に詰まる
    act(() => {
      result.current.deleteNote(1, id1!)
    })

    const remaining = result.current.score.measures[0]!.notes.find((n) => n.id === id2!)
    expect(remaining).toBeDefined()
    expect(remaining!.startBeat).toBe(0)
  })

  it('全音符を削除すると空の小節になる', () => {
    const { result } = renderHook(() => useScoreEditor())

    act(() => {
      result.current.addNote(1, testPitch, 0, 'note')
    })

    // 全音符を削除
    const notes = result.current.score.measures[0]!.notes
    for (const n of notes) {
      act(() => {
        result.current.deleteNote(1, n.id)
      })
    }

    expect(result.current.score.measures[0]!.notes.length).toBe(0)
  })

  it('音符を差し替えできる (replaceNote)', () => {
    const { result } = renderHook(() => useScoreEditor())

    let noteId: string
    act(() => {
      noteId = result.current.addNote(1, testPitch, 0, 'note')
    })

    const newPitch = {
      shinobueNumber: 5,
      register: 'kan' as const,
      frequency: 1568,
      midiNote: 79,
      western: 'G6',
    }

    act(() => {
      result.current.replaceNote(1, noteId!, newPitch, 'note')
    })

    const note = result.current.score.measures[0]!.notes.find((n) => n.id === noteId!)
    expect(note).toBeDefined()
    expect(note!.pitch!.western).toBe('G6')
    expect(note!.type).toBe('note')
  })

  it('replaceNote で休符に変換できる', () => {
    const { result } = renderHook(() => useScoreEditor())

    let noteId: string
    act(() => {
      noteId = result.current.addNote(1, testPitch, 0, 'note')
    })

    act(() => {
      result.current.replaceNote(1, noteId!, undefined, 'rest')
    })

    const note = result.current.score.measures[0]!.notes.find((n) => n.id === noteId!)
    expect(note!.type).toBe('rest')
    expect(note!.pitch).toBeUndefined()
  })

  it('toggleTie で音符の直後にタイを追加できる', () => {
    const { result } = renderHook(() => useScoreEditor())

    let noteId: string
    act(() => {
      noteId = result.current.addNote(1, testPitch, 0, 'note')
    })

    const beforeCount = result.current.score.measures[0]!.notes.length

    act(() => {
      result.current.toggleTie(1, noteId!)
    })

    const notes = result.current.score.measures[0]!.notes
    expect(notes.length).toBe(beforeCount + 1)

    // noteId の直後にタイが挿入されている
    const noteIndex = notes.findIndex((n) => n.id === noteId!)
    expect(notes[noteIndex + 1]!.type).toBe('tie')
  })

  it('toggleTie で既存のタイを削除できる', () => {
    const { result } = renderHook(() => useScoreEditor())

    let noteId: string
    act(() => {
      noteId = result.current.addNote(1, testPitch, 0, 'note')
    })

    // タイを追加
    act(() => {
      result.current.toggleTie(1, noteId!)
    })

    const countWithTie = result.current.score.measures[0]!.notes.length

    // もう一度 toggleTie でタイを削除
    act(() => {
      result.current.toggleTie(1, noteId!)
    })

    expect(result.current.score.measures[0]!.notes.length).toBe(countWithTie - 1)
  })

  it('toggleTie は休符には適用されない', () => {
    const { result } = renderHook(() => useScoreEditor())

    // 初期の休符のIDを取得
    const restId = result.current.score.measures[0]!.notes[0]!.id
    const beforeCount = result.current.score.measures[0]!.notes.length

    act(() => {
      result.current.toggleTie(1, restId)
    })

    // 変化なし
    expect(result.current.score.measures[0]!.notes.length).toBe(beforeCount)
  })

  it('toggleTie でタイ選択中にさらにタイを追加できる', () => {
    const { result } = renderHook(() => useScoreEditor())

    // 音符を追加
    let noteId: string
    act(() => {
      noteId = result.current.addNote(1, testPitch, 0, 'note')
    })

    // 音符の後にタイを追加
    act(() => {
      result.current.toggleTie(1, noteId!)
    })

    const notes1 = result.current.score.measures[0]!.notes
    const tieIndex = notes1.findIndex((n) => n.type === 'tie')
    const tieId = notes1[tieIndex]!.id
    const countAfterFirstTie = notes1.length

    // タイを選択して更にタイを追加
    act(() => {
      result.current.toggleTie(1, tieId)
    })

    const notes2 = result.current.score.measures[0]!.notes
    expect(notes2.length).toBe(countAfterFirstTie + 1)

    // 元のタイの直後に新しいタイが挿入されている
    const origTieIdx = notes2.findIndex((n) => n.id === tieId)
    expect(notes2[origTieIdx + 1]!.type).toBe('tie')
    expect(notes2[origTieIdx + 1]!.id).not.toBe(tieId)
  })

  it('toggleTie で連続タイを作れる（三 ～ ～ ～）', () => {
    const { result } = renderHook(() => useScoreEditor())

    // 音符を追加
    let noteId: string
    act(() => {
      noteId = result.current.addNote(1, testPitch, 0, 'note')
    })

    // 1個目のタイ
    act(() => {
      result.current.toggleTie(1, noteId!)
    })

    // 1個目のタイのIDを取得して選択し、2個目のタイを追加
    let tie1Id: string
    {
      const notes = result.current.score.measures[0]!.notes
      const noteIdx = notes.findIndex((n) => n.id === noteId!)
      tie1Id = notes[noteIdx + 1]!.id
    }
    act(() => {
      result.current.toggleTie(1, tie1Id)
    })

    // 2個目のタイのIDを取得して選択し、3個目のタイを追加
    let tie2Id: string
    {
      const notes = result.current.score.measures[0]!.notes
      const tie1Idx = notes.findIndex((n) => n.id === tie1Id)
      tie2Id = notes[tie1Idx + 1]!.id
    }
    act(() => {
      result.current.toggleTie(1, tie2Id)
    })

    // 音符 + タイ3つ = 4つ (+ 初期の休符)
    const notes = result.current.score.measures[0]!.notes
    const noteIdx = notes.findIndex((n) => n.id === noteId!)
    expect(notes[noteIdx]!.type).toBe('note')
    expect(notes[noteIdx + 1]!.type).toBe('tie')
    expect(notes[noteIdx + 2]!.type).toBe('tie')
    expect(notes[noteIdx + 3]!.type).toBe('tie')
  })

  describe('appendTie', () => {
    it('末尾が音符の場合にタイを追加できる', () => {
      const { result } = renderHook(() => useScoreEditor())

      // 音符を追加
      act(() => {
        result.current.addNote(1, testPitch, 0, 'note')
      })

      const beforeCount = result.current.score.measures[0]!.notes.length

      act(() => {
        result.current.appendTie(1)
      })

      const notes = result.current.score.measures[0]!.notes
      expect(notes.length).toBe(beforeCount + 1)
      expect(notes[notes.length - 1]!.type).toBe('tie')
    })

    it('末尾がタイの場合にさらにタイを追加できる', () => {
      const { result } = renderHook(() => useScoreEditor())

      // 音符を追加
      let noteId: string
      act(() => {
        noteId = result.current.addNote(1, testPitch, 0, 'note')
      })

      // タイを追加
      act(() => {
        result.current.toggleTie(1, noteId!)
      })

      const beforeCount = result.current.score.measures[0]!.notes.length

      // appendTie でさらにタイを追加
      act(() => {
        result.current.appendTie(1)
      })

      const notes = result.current.score.measures[0]!.notes
      expect(notes.length).toBe(beforeCount + 1)
      expect(notes[notes.length - 1]!.type).toBe('tie')
    })

    it('末尾が休符の場合はタイを追加しない', () => {
      const { result } = renderHook(() => useScoreEditor())

      // 初期状態は休符のみ
      const beforeCount = result.current.score.measures[0]!.notes.length

      act(() => {
        result.current.appendTie(1)
      })

      expect(result.current.score.measures[0]!.notes.length).toBe(beforeCount)
    })

    it('空の小節にはタイを追加しない', () => {
      const { result } = renderHook(() => useScoreEditor())

      // 初期の休符を削除して空にする
      const restId = result.current.score.measures[0]!.notes[0]!.id
      act(() => {
        result.current.deleteNote(1, restId)
      })
      expect(result.current.score.measures[0]!.notes.length).toBe(0)

      act(() => {
        result.current.appendTie(1)
      })

      expect(result.current.score.measures[0]!.notes.length).toBe(0)
    })

    it('appendTie 後に新しいタイが選択される', () => {
      const { result } = renderHook(() => useScoreEditor())

      act(() => {
        result.current.addNote(1, testPitch, 0, 'note')
      })

      act(() => {
        result.current.appendTie(1)
      })

      const notes = result.current.score.measures[0]!.notes
      const lastNote = notes[notes.length - 1]!
      expect(lastNote.type).toBe('tie')
      expect(result.current.selectedNoteId).toBe(lastNote.id)
    })
  })

  it('Undo/Redo が動作する', () => {
    const { result } = renderHook(() => useScoreEditor())

    const initialTitle = result.current.score.metadata.title

    act(() => {
      result.current.updateMetadata({ title: '変更後' })
    })
    expect(result.current.score.metadata.title).toBe('変更後')

    act(() => {
      result.current.undo()
    })
    expect(result.current.score.metadata.title).toBe(initialTitle)

    act(() => {
      result.current.redo()
    })
    expect(result.current.score.metadata.title).toBe('変更後')
  })

  it('削除後に Undo で元の音符が復元される', () => {
    const { result } = renderHook(() => useScoreEditor())

    let noteId: string
    act(() => {
      noteId = result.current.addNote(1, testPitch, 0, 'note')
    })

    const beforeCount = result.current.score.measures[0]!.notes.length

    act(() => {
      result.current.deleteNote(1, noteId!)
    })

    // 削除後は音符が除去されている
    expect(result.current.score.measures[0]!.notes.find((n) => n.id === noteId!)).toBeUndefined()

    // Undo で音符が復元される
    act(() => {
      result.current.undo()
    })

    expect(result.current.score.measures[0]!.notes.length).toBe(beforeCount)
    const restoredNote = result.current.score.measures[0]!.notes.find((n) => n.id === noteId!)
    expect(restoredNote!.type).toBe('note')
    expect(restoredNote!.pitch!.western).toBe('E5')
  })

  it('小節を追加できる', () => {
    const { result } = renderHook(() => useScoreEditor())
    const initialCount = result.current.score.measures.length

    act(() => {
      result.current.addMeasure()
    })

    expect(result.current.score.measures.length).toBe(initialCount + 1)
  })

  it('小節を削除できる（1小節残す）', () => {
    const { result } = renderHook(() => useScoreEditor())

    act(() => {
      result.current.deleteMeasure(2)
    })

    expect(result.current.score.measures.length).toBe(3)

    const { result: result2 } = renderHook(() =>
      useScoreEditor(createEmptyScore({ measureCount: 1 })),
    )
    act(() => {
      result2.current.deleteMeasure(1)
    })
    expect(result2.current.score.measures.length).toBe(1)
  })

  it('音価を変更できる', () => {
    const { result } = renderHook(() => useScoreEditor())

    act(() => {
      result.current.setCurrentDuration('eighth')
    })

    expect(result.current.currentDuration).toBe('eighth')
  })

  it('選択中の音符の音価を変更できる (changeDuration)', () => {
    const { result } = renderHook(() => useScoreEditor())

    let noteId: string
    act(() => {
      noteId = result.current.addNote(1, testPitch, 0, 'note')
    })

    act(() => {
      result.current.changeDuration(noteId!, 1, 'eighth')
    })

    const note = result.current.score.measures[0]!.notes.find((n) => n.id === noteId!)
    expect(note!.duration.type).toBe('eighth')
  })

  it('loadScore で楽譜を差し替えられる', () => {
    const { result } = renderHook(() => useScoreEditor())

    const newScore = createEmptyScore({ title: '新しい曲', measureCount: 8 })
    act(() => {
      result.current.loadScore(newScore)
    })

    expect(result.current.score.metadata.title).toBe('新しい曲')
    expect(result.current.score.measures.length).toBe(8)
    expect(result.current.selectedNoteId).toBeNull()
    expect(result.current.isDirty).toBe(false)
  })

  describe('isDirty と markSaved', () => {
    it('初期状態は isDirty=false', () => {
      const { result } = renderHook(() => useScoreEditor())
      expect(result.current.isDirty).toBe(false)
    })

    it('編集後に isDirty=true になる', () => {
      const { result } = renderHook(() => useScoreEditor())

      act(() => {
        result.current.addNote(1, testPitch, 0, 'note')
      })

      expect(result.current.isDirty).toBe(true)
    })

    it('markSaved で isDirty=false になる', () => {
      const { result } = renderHook(() => useScoreEditor())

      act(() => {
        result.current.addNote(1, testPitch, 0, 'note')
      })
      expect(result.current.isDirty).toBe(true)

      act(() => {
        result.current.markSaved('song-123')
      })
      expect(result.current.isDirty).toBe(false)
      expect(result.current.savedSongId).toBe('song-123')
    })

    it('markSaved 後の編集で再び isDirty=true になる', () => {
      const { result } = renderHook(() => useScoreEditor())

      act(() => {
        result.current.addNote(1, testPitch, 0, 'note')
      })
      act(() => {
        result.current.markSaved('song-123')
      })
      expect(result.current.isDirty).toBe(false)

      act(() => {
        result.current.updateMetadata({ title: '更新' })
      })
      expect(result.current.isDirty).toBe(true)
    })

    it('loadScore で isDirty=false にリセットされる', () => {
      const { result } = renderHook(() => useScoreEditor())

      act(() => {
        result.current.addNote(1, testPitch, 0, 'note')
      })
      expect(result.current.isDirty).toBe(true)

      act(() => {
        result.current.loadScore(createEmptyScore({ title: '別の曲' }))
      })
      expect(result.current.isDirty).toBe(false)
    })
  })
})
