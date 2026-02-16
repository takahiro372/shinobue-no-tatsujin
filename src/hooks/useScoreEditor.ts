import { useState, useCallback, useRef } from 'react'
import type { Score } from '../score/ScoreModel'
import {
  createEmptyScore,
  addNoteToMeasure,
  updateMeasure,
  appendMeasure,
  removeMeasure,
  createNoteEvent,
} from '../score/ScoreModel'
import type { DurationType } from '../types/music'
import type { NotePitch } from '../score/ScoreModel'

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

  /** 音符を削除（休符で置換） */
  const deleteNote = useCallback((measureNumber: number, noteId: string) => {
    pushUndo(score)
    const updated = updateMeasure(score, measureNumber, (m) => ({
      ...m,
      notes: m.notes.map((n) =>
        n.id === noteId
          ? { ...n, type: 'rest' as const, pitch: undefined }
          : n,
      ),
    }))
    setScore(updated)
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null)
    }
    setIsDirty(true)
  }, [score, selectedNoteId, pushUndo])

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
    addMeasure,
    deleteMeasure,
    updateMetadata,
    loadScore,
    markSaved,
    undo,
    redo,
  }
}
