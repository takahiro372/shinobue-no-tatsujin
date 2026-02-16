import type { DurationType } from '../../types/music'

interface EditorToolbarProps {
  currentDuration: DurationType
  onDurationChange: (d: DurationType) => void
  onAddMeasure: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  tempo: number
  onTempoChange: (bpm: number) => void
  title: string
  onTitleChange: (title: string) => void
  hasSelection: boolean
  onDelete: () => void
  onSave: () => void
  onSaveAs: () => void
  onImport: () => void
  isDirty: boolean
}

const DURATIONS: { type: DurationType; label: string; shortcut: string }[] = [
  { type: 'whole', label: '全', shortcut: '1' },
  { type: 'half', label: '二分', shortcut: '2' },
  { type: 'quarter', label: '四分', shortcut: '4' },
  { type: 'eighth', label: '八分', shortcut: '8' },
  { type: 'sixteenth', label: '十六', shortcut: '6' },
]

export function EditorToolbar({
  currentDuration,
  onDurationChange,
  onAddMeasure,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  tempo,
  onTempoChange,
  title,
  onTitleChange,
  hasSelection,
  onDelete,
  onSave,
  onSaveAs,
  onImport,
  isDirty,
}: EditorToolbarProps) {
  return (
    <div className="bg-white rounded-lg shadow p-3 flex flex-wrap items-center gap-3">
      {/* 曲名 */}
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="border rounded px-2 py-1 text-sm w-40"
        placeholder="曲名"
      />

      {/* 音価選択 */}
      <div className="flex gap-1 border-l pl-3">
        {DURATIONS.map((d) => (
          <button
            key={d.type}
            onClick={() => onDurationChange(d.type)}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
              currentDuration === d.type
                ? 'bg-[#C41E3A] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={`${d.label}音符 (${d.shortcut})`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* BPM */}
      <div className="flex items-center gap-1 border-l pl-3">
        <span className="text-xs text-gray-500">BPM</span>
        <input
          type="number"
          value={tempo}
          onChange={(e) => onTempoChange(Number(e.target.value))}
          className="w-14 border rounded px-1 py-1 text-xs text-center"
          min={30}
          max={300}
        />
      </div>

      {/* 戻す / やり直し */}
      <div className="flex gap-1 border-l pl-3">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
          title="元に戻す (Ctrl+Z)"
        >
          ↩ 戻す
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
          title="やり直し (Ctrl+Y)"
        >
          ↪ やり直し
        </button>
      </div>

      {/* 削除 */}
      <div className="border-l pl-3">
        <button
          onClick={onDelete}
          disabled={!hasSelection}
          className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-red-100 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="選択中の音符を削除 (Delete)"
        >
          🗑 削除
        </button>
      </div>

      {/* 保存 / 名前を付けて保存 */}
      <div className="flex gap-1 border-l pl-3">
        <button
          onClick={onSave}
          className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
            isDirty
              ? 'bg-[#2D8B4E] text-white hover:bg-[#247a42]'
              : 'bg-gray-100 text-gray-500'
          }`}
          title="保存 (Ctrl+S)"
        >
          💾 保存
        </button>
        <button
          onClick={onSaveAs}
          className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          title="名前を付けて保存"
        >
          📄 別名保存
        </button>
      </div>

      {/* インポート */}
      <div className="border-l pl-3">
        <button
          onClick={onImport}
          className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          title="MusicXMLファイルをインポート"
        >
          📥 インポート
        </button>
      </div>

      {/* 小節追加 */}
      <button
        onClick={onAddMeasure}
        className="px-2 py-1 text-xs rounded bg-[#1B4F72] text-white hover:bg-[#163d5a] ml-auto"
      >
        + 小節追加
      </button>
    </div>
  )
}
