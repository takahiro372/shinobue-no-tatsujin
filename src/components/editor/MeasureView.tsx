import type { Measure, NoteEvent } from '../../score/ScoreModel'
import { durationToBeats } from '../../score/ScoreModel'
import { noteEventToSujiText, durationUnderlines } from '../../score/ShinobueNotation'

interface MeasureViewProps {
  measure: Measure
  selectedNoteId: string | null
  onNoteClick: (noteId: string) => void
  onEmptyClick: (startBeat: number) => void
  onDeleteNote: (noteId: string) => void
}

/**
 * 1小節分の音符を表示するビュー
 * 数字譜表示で、クリックで音符を選択/追加できる
 */
export function MeasureView({
  measure,
  selectedNoteId,
  onNoteClick,
  onEmptyClick,
  onDeleteNote,
}: MeasureViewProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-2 min-w-[120px]">
      {/* 小節番号 */}
      <div className="text-xs text-gray-400 mb-1">{measure.number}</div>

      {/* 音符一覧 */}
      <div className="flex gap-1 items-center min-h-[48px]">
        {measure.notes.length === 0 ? (
          <button
            onClick={() => onEmptyClick(0)}
            className="w-full h-12 border-2 border-dashed border-gray-300 rounded text-gray-400 text-xs hover:border-[#C41E3A] hover:text-[#C41E3A] transition-colors"
          >
            +
          </button>
        ) : (
          measure.notes.map((note) => (
            <NoteCell
              key={note.id}
              note={note}
              isSelected={note.id === selectedNoteId}
              onClick={() => onNoteClick(note.id)}
              onDelete={() => onDeleteNote(note.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function NoteCell({
  note,
  isSelected,
  onClick,
  onDelete,
}: {
  note: NoteEvent
  isSelected: boolean
  onClick: () => void
  onDelete: () => void
}) {
  const text = noteEventToSujiText(note)
  const underlines = durationUnderlines(note.duration.type)
  const beats = durationToBeats(note.duration)

  // 音価に応じた幅
  const widthClass = beats >= 2 ? 'min-w-[48px]' : beats >= 1 ? 'min-w-[36px]' : 'min-w-[28px]'

  const registerColor = note.type === 'tie'
    ? 'text-[#6C3483]'
    : note.pitch
      ? note.pitch.register === 'ro'
        ? 'text-[#1B4F72]'
        : note.pitch.register === 'kan'
          ? 'text-[#2D8B4E]'
          : 'text-[#C41E3A]'
      : 'text-gray-500'

  return (
    <button
      onClick={onClick}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onDelete()
      }}
      className={`${widthClass} h-12 flex flex-col items-center justify-center rounded text-sm font-bold transition-all relative
        ${isSelected
          ? 'bg-[#C41E3A]/10 ring-2 ring-[#C41E3A]'
          : 'hover:bg-gray-50'
        }
        ${registerColor}
      `}
      title={`${note.pitch?.western ?? '休符'} (ダブルクリックで削除)`}
    >
      {/* 音域ドット */}
      {note.pitch && note.pitch.register !== 'ro' && (
        <span className="text-[8px] leading-none">
          {'・'.repeat(note.pitch.register === 'kan' ? 1 : 2)}
        </span>
      )}

      {/* 音名 */}
      <span className="leading-tight">{text.replace(/[・\n]/g, '')}</span>

      {/* 下線 */}
      {underlines > 0 && (
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex flex-col gap-px">
          {Array.from({ length: underlines }, (_, i) => (
            <div key={i} className="w-5 h-px bg-current" />
          ))}
        </div>
      )}

      {/* 付点 */}
      {note.duration.dots > 0 && (
        <span className="absolute top-1 right-0.5 text-[8px]">.</span>
      )}
    </button>
  )
}
