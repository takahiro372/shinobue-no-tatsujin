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

  it('音符を削除すると休符に置換される', () => {
    const { result } = renderHook(() => useScoreEditor())

    let noteId: string
    act(() => {
      noteId = result.current.addNote(1, testPitch, 0, 'note')
    })

    act(() => {
      result.current.deleteNote(1, noteId!)
    })

    const note = result.current.score.measures[0]!.notes.find((n) => n.id === noteId!)
    expect(note).toBeDefined()
    expect(note!.type).toBe('rest')
    expect(note!.pitch).toBeUndefined()
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

    act(() => {
      result.current.deleteNote(1, noteId!)
    })

    // 削除後は休符
    const deletedNote = result.current.score.measures[0]!.notes.find((n) => n.id === noteId!)
    expect(deletedNote!.type).toBe('rest')

    // Undo で音符に戻る
    act(() => {
      result.current.undo()
    })

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
