import { useState, useCallback, useRef } from 'react'
import type { Score } from '../score/ScoreModel'
import {
  createEmptyScore,
  addNoteToMeasure,
  updateMeasure,
  appendMeasure,
  removeMeasure,
  createNoteEvent,
  generateNoteId,
} from '../score/ScoreModel'
import type { DurationType } from '../types/music'
import type { NotePitch, NoteEvent } from '../score/ScoreModel'

const MAX_UNDO = 50

export interface ScoreEditorState {
  score: Score
  selectedNoteId: string | null
  selectedMeasure: number
  currentDuration: DurationType
  canUndo: boolean
  canRedo: boolean
  isDirty: boolean
  savedSongId: string | null
}

export function useScoreEditor(initialScore?: Score) {
  const [score, setScore] = useState<Score>(initialScore ?? createEmptyScore())
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [selectedMeasure, setSelectedMeasure] = useState(1)
  const [currentDuration, setCurrentDuration] = useState<DurationType>('quarter')
  const [isDirty, setIsDirty] = useState(false)
  const [savedSongId, setSavedSongId] = useState<string | null>(null)

  const undoStack = useRef<Score[]>([])
  const redoStack = useRef<Score[]>([])

  const pushUndo = useCallback((prevScore: Score) => {
    undoStack.current = [...undoStack.current.slice(-(MAX_UNDO - 1)), prevScore]
    redoStack.current = []
  }, [])

  const undo = useCallback(() => {
    const prev = undoStack.current.pop()
    if (!prev) return
    redoStack.current.push(score)
    setScore(prev)
    setSelectedNoteId(null)
    setIsDirty(true)
  }, [score])

  const redo = useCallback(() => {
    const next = redoStack.current.pop()
    if (!next) return
    undoStack.current.push(score)
    setScore(next)
    setSelectedNoteId(null)
    setIsDirty(true)
  }, [score])

  /** 音符を追加 */
  const addNote = useCallback((
    measureNumber: number,
    pitch: NotePitch | undefined,
    startBeat: number,
    type: 'note' | 'rest' = 'note',
  ) => {
    pushUndo(score)
    const note = createNoteEvent({
      type,
      pitch,
      durationType: currentDuration,
      startBeat,
    })
    const updated = updateMeasure(score, measureNumber, (m) =>
      addNoteToMeasure(m, note),
    )
    setScore(updated)
    setSelectedNoteId(note.id)
    setIsDirty(true)
    return note.id
  }, [score, currentDuration, pushUndo])

  /** 音符を完全に削除し、後続の音符を前に詰める */
  const deleteNote = useCallback((measureNumber: number, noteId: string) => {
    pushUndo(score)
    const updated = updateMeasure(score, measureNumber, (m) => {
      const filtered = m.notes.filter((n) => n.id !== noteId)
      // startBeat を詰め直す
      let beat = 0
      const reindexed = filtered.map((n) => {
        const updated = { ...n, startBeat: beat }
        beat += 1
        return updated
      })
      return { ...m, notes: reindexed }
    })
    setScore(updated)
    setSelectedNoteId(null)
    setIsDirty(true)
  }, [score, pushUndo])

  /** 選択中の音符を別の音に差し替え */
  const replaceNote = useCallback((
    measureNumber: number,
    noteId: string,
    pitch: NotePitch | undefined,
    type: 'note' | 'rest',
  ) => {
    pushUndo(score)
    const updated = updateMeasure(score, measureNumber, (m) => ({
      ...m,
      notes: m.notes.map((n) =>
        n.id === noteId
          ? { ...n, type, pitch: type === 'rest' ? undefined : pitch }
          : n,
      ),
    }))
    setScore(updated)
    setIsDirty(true)
  }, [score, pushUndo])

  /** 選択中の音符の音価を変更 */
  const changeDuration = useCallback((noteId: string, measureNumber: number, durationType: DurationType) => {
    pushUndo(score)
    const updated = updateMeasure(score, measureNumber, (m) => ({
      ...m,
      notes: m.notes.map((n) =>
        n.id === noteId
          ? { ...n, duration: { ...n.duration, type: durationType } }
          : n,
      ),
    }))
    setScore(updated)
    setIsDirty(true)
  }, [score, pushUndo])

  /** タイ（伸ばし）をトグル/追加: 音符の直後にタイを追加/削除、タイの直後にさらにタイを追加 */
  const toggleTie = useCallback((measureNumber: number, noteId: string) => {
    const measure = score.measures.find((m) => m.number === measureNumber)
    if (!measure) return

    const noteIndex = measure.notes.findIndex((n) => n.id === noteId)
    if (noteIndex === -1) return

    const targetNote = measure.notes[noteIndex]!
    // 休符にはタイを付けられない
    if (targetNote.type === 'rest') return

    const nextNote = measure.notes[noteIndex + 1]

    pushUndo(score)

    if (targetNote.type === 'note' && nextNote && nextNote.type === 'tie') {
      // 音符選択時: 直後がタイなら削除して詰める（トグル）
      const filtered = measure.notes.filter((n) => n.id !== nextNote.id)
      let beat = 0
      const reindexed = filtered.map((n) => {
        const updated = { ...n, startBeat: beat }
        beat += 1
        return updated
      })
      setScore(updateMeasure(score, measureNumber, (m) => ({ ...m, notes: reindexed })))
    } else {
      // 音符またはタイ選択時: 直後にタイを挿入
      const tieNote: NoteEvent = {
        id: generateNoteId(),
        type: 'tie',
        duration: { type: currentDuration, dots: 0 },
        startBeat: targetNote.startBeat + 1,
      }
      const newNotes = [...measure.notes]
      newNotes.splice(noteIndex + 1, 0, tieNote)
      // startBeat を詰め直す
      let beat = 0
      const reindexed = newNotes.map((n) => {
        const updated = { ...n, startBeat: beat }
        beat += 1
        return updated
      })
      setScore(updateMeasure(score, measureNumber, (m) => ({ ...m, notes: reindexed })))
    }
    setIsDirty(true)
  }, [score, currentDuration, pushUndo])

  /** 追加モードで末尾にタイを追加（末尾が音符またはタイの場合のみ） */
  const appendTie = useCallback((measureNumber: number) => {
    const measure = score.measures.find((m) => m.number === measureNumber)
    if (!measure || measure.notes.length === 0) return

    const lastNote = measure.notes[measure.notes.length - 1]!
    if (lastNote.type !== 'note' && lastNote.type !== 'tie') return

    pushUndo(score)
    const tieNote: NoteEvent = {
      id: generateNoteId(),
      type: 'tie',
      duration: { type: currentDuration, dots: 0 },
      startBeat: lastNote.startBeat + 1,
    }
    const updated = updateMeasure(score, measureNumber, (m) =>
      addNoteToMeasure(m, tieNote),
    )
    setScore(updated)
    setSelectedNoteId(tieNote.id)
    setIsDirty(true)
  }, [score, currentDuration, pushUndo])

  /** 小節を末尾に追加 */
  const addMeasure = useCallback(() => {
    pushUndo(score)
    setScore(appendMeasure(score))
    setIsDirty(true)
  }, [score, pushUndo])

  /** 小節を削除 */
  const deleteMeasure = useCallback((measureNumber: number) => {
    if (score.measures.length <= 1) return
    pushUndo(score)
    setScore(removeMeasure(score, measureNumber))
    if (selectedMeasure === measureNumber) {
      setSelectedMeasure(Math.max(1, measureNumber - 1))
    }
    setIsDirty(true)
  }, [score, selectedMeasure, pushUndo])

  /** メタデータ更新 */
  const updateMetadata = useCallback((updates: Partial<Score['metadata']>) => {
    pushUndo(score)
    setScore({ ...score, metadata: { ...score.metadata, ...updates } })
    setIsDirty(true)
  }, [score, pushUndo])

  /** 楽譜全体を差し替え (インポート時) */
  const loadScore = useCallback((newScore: Score) => {
    pushUndo(score)
    setScore(newScore)
    setSelectedNoteId(null)
    setSelectedMeasure(1)
    setIsDirty(false)
  }, [score, pushUndo])

  /** 保存後にダーティフラグをリセット */
  const markSaved = useCallback((songId?: string) => {
    setIsDirty(false)
    if (songId !== undefined) {
      setSavedSongId(songId)
    }
  }, [])

  return {
    score,
    selectedNoteId,
    selectedMeasure,
    currentDuration,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    isDirty,
    savedSongId,

    setSelectedNoteId,
    setSelectedMeasure,
    setCurrentDuration,
    setSavedSongId,
    addNote,
    deleteNote,
    replaceNote,
    changeDuration,
    toggleTie,
    appendTie,
    addMeasure,
    deleteMeasure,
    updateMetadata,
    loadScore,
    markSaved,
    undo,
    redo,
  }
}
