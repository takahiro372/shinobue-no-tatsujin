import { useEffect, useCallback, useRef, useState } from 'react'
import { useScoreEditor } from '../../hooks/useScoreEditor'
import { useSettingsStore } from '../../store/settingsStore'
import { EditorToolbar } from './EditorToolbar'
import { MeasureView } from './MeasureView'
import { NoteInput } from './NoteInput'
import { ScoreDisplay } from './ScoreDisplay'
import { saveSong, getSongs, deleteSong, generateSongId } from '../../utils/songStorage'
import { parseMusicXML } from '../../score/ScoreParser'
import type { SavedSong } from '../../utils/songStorage'
import type { Score, NotePitch } from '../../score/ScoreModel'
import type { InputMode } from './NoteInput'
import type { DurationType } from '../../types/music'

interface ScoreEditorProps {
  initialScore?: Score
  onScoreChange?: (score: Score) => void
  onDirtyChange?: (dirty: boolean) => void
}

/**
 * 楽譜エディタ メインコンポーネント
 *
 * - ツールバー: 音価選択, テンポ, Undo/Redo, 削除, 保存
 * - 小節一覧: 横スクロール, クリックで音符選択/追加
 * - 音符入力パネル: 篠笛のボタンで入力
 * - 楽譜プレビュー: Canvas描画（数字譜/五線譜）
 * - ライブラリ: 保存済み楽曲の一覧
 */
export function ScoreEditor({ initialScore, onScoreChange, onDirtyChange }: ScoreEditorProps) {
  const { shinobueKey } = useSettingsStore()
  const editor = useScoreEditor(initialScore)
  const prevScoreRef = useRef(editor.score)

  // キーボードハンドラ用: 最新の editor 状態を ref で保持
  const editorRef = useRef(editor)
  editorRef.current = editor

  // ライブラリ
  const [songs, setSongs] = useState<SavedSong[]>([])
  const [showLibrary, setShowLibrary] = useState(false)

  // スコアが変わったらコールバック
  useEffect(() => {
    if (editor.score !== prevScoreRef.current) {
      prevScoreRef.current = editor.score
      onScoreChange?.(editor.score)
    }
  }, [editor.score, onScoreChange])

  // isDirty の変化を親に通知
  useEffect(() => {
    onDirtyChange?.(editor.isDirty)
  }, [editor.isDirty, onDirtyChange])

  // ブラウザ離脱時に未保存の変更を警告
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (editor.isDirty) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [editor.isDirty])

  // 音符入力: 選択中なら差し替え、選択中でなければ末尾追加
  const handleNoteSelect = useCallback((pitch: NotePitch) => {
    if (editor.selectedNoteId) {
      editor.replaceNote(editor.selectedMeasure, editor.selectedNoteId, pitch, 'note')
    } else {
      const measure = editor.score.measures.find((m) => m.number === editor.selectedMeasure)
      if (!measure) return
      const lastNote = measure.notes[measure.notes.length - 1]
      const startBeat = lastNote ? lastNote.startBeat + 1 : 0
      editor.addNote(editor.selectedMeasure, pitch, startBeat, 'note')
    }
  }, [editor])

  // 休符入力: 選択中なら休符に差し替え、未選択なら末尾に追加
  const handleRestSelect = useCallback(() => {
    if (editor.selectedNoteId) {
      editor.replaceNote(editor.selectedMeasure, editor.selectedNoteId, undefined, 'rest')
    } else {
      const measure = editor.score.measures.find((m) => m.number === editor.selectedMeasure)
      if (!measure) return
      const lastNote = measure.notes[measure.notes.length - 1]
      const startBeat = lastNote ? lastNote.startBeat + 1 : 0
      editor.addNote(editor.selectedMeasure, undefined, startBeat, 'rest')
    }
  }, [editor])

  // 音価変更: 選択中の音符の音価も変更
  const handleDurationChange = useCallback((duration: DurationType) => {
    editor.setCurrentDuration(duration)
    if (editor.selectedNoteId) {
      editor.changeDuration(editor.selectedNoteId, editor.selectedMeasure, duration)
    }
  }, [editor])

  // 削除ボタン
  const handleDelete = useCallback(() => {
    const ed = editorRef.current
    if (ed.selectedNoteId) {
      ed.deleteNote(ed.selectedMeasure, ed.selectedNoteId)
    }
  }, [])

  // 伸ばし（タイ）トグル / 追加モード末尾追加
  const handleTie = useCallback(() => {
    const ed = editorRef.current
    if (ed.selectedNoteId) {
      ed.toggleTie(ed.selectedMeasure, ed.selectedNoteId)
    } else {
      ed.appendTie(ed.selectedMeasure)
    }
  }, [])

  // 保存
  const handleSave = useCallback(async () => {
    const now = Date.now()
    const id = editor.savedSongId ?? generateSongId()
    const song: SavedSong = {
      id,
      title: editor.score.metadata.title || '無題',
      score: editor.score,
      createdAt: editor.savedSongId ? (songs.find((s) => s.id === editor.savedSongId)?.createdAt ?? now) : now,
      updatedAt: now,
    }
    await saveSong(song)
    editor.markSaved(id)
    await refreshLibrary()
  }, [editor, songs])

  // 名前を付けて保存
  const handleSaveAs = useCallback(async () => {
    const newTitle = window.prompt('新しい曲名を入力してください', editor.score.metadata.title || '無題')
    if (newTitle === null) return

    editor.updateMetadata({ title: newTitle })
    const now = Date.now()
    const id = generateSongId()
    const song: SavedSong = {
      id,
      title: newTitle,
      score: { ...editor.score, metadata: { ...editor.score.metadata, title: newTitle } },
      createdAt: now,
      updatedAt: now,
    }
    await saveSong(song)
    editor.markSaved(id)
    await refreshLibrary()
  }, [editor])

  // ライブラリから読み込み
  const handleLoadSong = useCallback((song: SavedSong) => {
    if (editor.isDirty) {
      const ok = window.confirm('未保存の変更があります。破棄して読み込みますか？')
      if (!ok) return
    }
    editor.loadScore(song.score)
    editor.markSaved(song.id)
  }, [editor])

  // ライブラリから削除
  const handleDeleteSong = useCallback(async (id: string) => {
    await deleteSong(id)
    await refreshLibrary()
  }, [])

  // MusicXML インポート
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImport = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const score = parseMusicXML(text, shinobueKey)

    // エディタに読み込み
    editor.loadScore(score)

    // IndexedDB に自動保存
    const now = Date.now()
    const id = generateSongId()
    const song: SavedSong = {
      id,
      title: score.metadata.title || file.name.replace(/\.(musicxml|xml)$/i, ''),
      score,
      createdAt: now,
      updatedAt: now,
    }
    await saveSong(song)
    editor.markSaved(id)
    await refreshLibrary()

    // input をリセット（同じファイルの再選択を可能に）
    e.target.value = ''
  }, [editor, shinobueKey])

  // ライブラリ更新
  const refreshLibrary = useCallback(async () => {
    const list = await getSongs()
    setSongs(list)
  }, [])

  // ライブラリ開閉時に読み込み
  useEffect(() => {
    if (showLibrary) {
      refreshLibrary()
    }
  }, [showLibrary, refreshLibrary])

  // キーボードショートカット (ref 経由で最新状態を参照し、安定したリスナーを保つ)
  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave
  const handleDurationChangeRef = useRef(handleDurationChange)
  handleDurationChangeRef.current = handleDurationChange

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ed = editorRef.current
      // Undo: Ctrl+Z
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        ed.undo()
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault()
        ed.redo()
      }
      // Save: Ctrl+S
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handleSaveRef.current()
      }
      // Escape: 選択解除
      if (e.key === 'Escape') {
        e.preventDefault()
        ed.setSelectedNoteId(null)
      }
      // Delete selected note
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (ed.selectedNoteId) {
          e.preventDefault()
          ed.deleteNote(ed.selectedMeasure, ed.selectedNoteId)
        }
      }
      // Tie: T key
      if (!e.ctrlKey && !e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault()
        if (ed.selectedNoteId) {
          ed.toggleTie(ed.selectedMeasure, ed.selectedNoteId)
        } else {
          ed.appendTie(ed.selectedMeasure)
        }
      }
      // Duration shortcuts
      const durationMap: Record<string, DurationType> = {
        '4': 'quarter',
        '8': 'eighth',
        '6': 'sixteenth',
      }
      if (!e.ctrlKey && !e.altKey && durationMap[e.key]) {
        handleDurationChangeRef.current(durationMap[e.key]!)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // 入力モード
  const inputMode: InputMode = editor.selectedNoteId ? 'overwrite' : 'append'

  // 伸ばしボタンの有効判定: 選択中、または追加モードで末尾が音符/タイ
  const canTie = (() => {
    if (editor.selectedNoteId) return true
    const measure = editor.score.measures.find((m) => m.number === editor.selectedMeasure)
    if (!measure || measure.notes.length === 0) return false
    const lastNote = measure.notes[measure.notes.length - 1]!
    return lastNote.type === 'note' || lastNote.type === 'tie'
  })()

  // 小節エリアの空白クリックで選択解除
  const handleDeselect = useCallback(() => {
    editor.setSelectedNoteId(null)
  }, [editor])

  return (
    <div className="space-y-4">
      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".musicxml,.xml"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ツールバー */}
      <EditorToolbar
        currentDuration={editor.currentDuration}
        onDurationChange={handleDurationChange}
        onAddMeasure={editor.addMeasure}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        onUndo={editor.undo}
        onRedo={editor.redo}
        tempo={editor.score.metadata.tempo}
        onTempoChange={(bpm) => editor.updateMetadata({ tempo: bpm })}
        title={editor.score.metadata.title}
        onTitleChange={(title) => editor.updateMetadata({ title })}
        hasSelection={editor.selectedNoteId !== null}
        canTie={canTie}
        onDelete={handleDelete}
        onTie={handleTie}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onImport={handleImport}
        isDirty={editor.isDirty}
      />

      {/* ライブラリ切替 */}
      <button
        onClick={() => setShowLibrary((v) => !v)}
        className="text-sm text-[#1B4F72] hover:underline"
      >
        {showLibrary ? '▼ ライブラリを閉じる' : '▶ ライブラリを表示'}
      </button>

      {/* ライブラリ */}
      {showLibrary && (
        <div className="bg-white rounded-lg shadow p-3">
          <h3 className="text-sm font-bold text-gray-600 mb-2">保存済み楽曲</h3>
          {songs.length === 0 ? (
            <p className="text-xs text-gray-400">保存された楽曲はありません</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {songs.map((song) => (
                <div
                  key={song.id}
                  className={`flex-shrink-0 border rounded-lg p-2 min-w-[140px] text-xs ${
                    editor.savedSongId === song.id
                      ? 'border-[#2D8B4E] bg-[#2D8B4E]/5'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="font-medium truncate mb-1">{song.title}</div>
                  <div className="text-gray-400 mb-2">
                    {new Date(song.updatedAt).toLocaleDateString()}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleLoadSong(song)}
                      className="px-2 py-0.5 rounded bg-[#1B4F72] text-white hover:bg-[#163d5a] text-[10px]"
                    >
                      読込
                    </button>
                    <button
                      onClick={() => handleDeleteSong(song.id)}
                      className="px-2 py-0.5 rounded bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-600 text-[10px]"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-4">
        <div className="space-y-4">
          {/* 小節一覧 */}
          <div className="overflow-x-auto pb-2" onClick={handleDeselect} data-testid="measures-area">
            <div className="flex gap-2 min-w-max">
              {editor.score.measures.map((measure) => (
                <div
                  key={measure.number}
                  onClick={(e) => { e.stopPropagation(); editor.setSelectedMeasure(measure.number) }}
                  className={`cursor-pointer transition-all ${
                    editor.selectedMeasure === measure.number
                      ? 'ring-2 ring-[#C41E3A] rounded-lg'
                      : ''
                  }`}
                >
                  <MeasureView
                    measure={measure}
                    selectedNoteId={editor.selectedNoteId}
                    onNoteClick={(id) => {
                      editor.setSelectedMeasure(measure.number)
                      editor.setSelectedNoteId(id)
                    }}
                    onEmptyClick={(beat) => {
                      editor.setSelectedMeasure(measure.number)
                      editor.addNote(measure.number, undefined, beat, 'rest')
                    }}
                    onDeleteNote={(id) => editor.deleteNote(measure.number, id)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Canvas プレビュー */}
          <ScoreDisplay
            score={editor.score}
            highlightNoteId={editor.selectedNoteId}
          />
        </div>

        {/* 音符入力パネル */}
        <NoteInput
          shinobueKey={shinobueKey}
          mode={inputMode}
          onNoteSelect={handleNoteSelect}
          onRestSelect={handleRestSelect}
        />
      </div>
    </div>
  )
}
