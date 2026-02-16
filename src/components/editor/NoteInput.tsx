import { getFingeringChart } from '../../shinobue/FingeringChart'
import type { ShinobueNote } from '../../types/shinobue'
import type { NotePitch } from '../../score/ScoreModel'
import { frequencyToMidiNote } from '../../utils/frequency'

interface NoteInputProps {
  shinobueKey: string
  onNoteSelect: (pitch: NotePitch) => void
  onRestSelect: () => void
}

/**
 * 音符入力パネル
 * 篠笛の音を数字ボタン(0-7)とレジスタ切替で入力できる
 */
export function NoteInput({ shinobueKey, onNoteSelect, onRestSelect }: NoteInputProps) {
  const chart = getFingeringChart(shinobueKey)

  const roNotes = chart.filter((n) => n.register === 'ro')
  const kanNotes = chart.filter((n) => n.register === 'kan')
  const daikanNotes = chart.filter((n) => n.register === 'daikan')

  const handleSelect = (note: ShinobueNote) => {
    const pitch: NotePitch = {
      shinobueNumber: note.number,
      register: note.register,
      frequency: note.frequency,
      midiNote: Math.round(frequencyToMidiNote(note.frequency)),
      western: note.western,
    }
    onNoteSelect(pitch)
  }

  return (
    <div className="bg-white rounded-lg shadow p-3 space-y-3">
      <h3 className="text-sm font-bold text-gray-600">音符入力</h3>

      {/* 呂音 */}
      <div>
        <div className="text-xs text-[#1B4F72] font-medium mb-1">呂音</div>
        <div className="flex gap-1 flex-wrap">
          {roNotes.map((note) => (
            <NoteButton key={`ro-${note.number}`} note={note} onClick={() => handleSelect(note)} color="bg-[#1B4F72]" />
          ))}
        </div>
      </div>

      {/* 甲音 */}
      <div>
        <div className="text-xs text-[#2D8B4E] font-medium mb-1">甲音</div>
        <div className="flex gap-1 flex-wrap">
          {kanNotes.map((note) => (
            <NoteButton key={`kan-${note.number}`} note={note} onClick={() => handleSelect(note)} color="bg-[#2D8B4E]" />
          ))}
        </div>
      </div>

      {/* 大甲 */}
      <div>
        <div className="text-xs text-[#C41E3A] font-medium mb-1">大甲</div>
        <div className="flex gap-1 flex-wrap">
          {daikanNotes.map((note) => (
            <NoteButton key={`daikan-${note.number}`} note={note} onClick={() => handleSelect(note)} color="bg-[#C41E3A]" />
          ))}
        </div>
      </div>

      {/* 休符 */}
      <button
        onClick={onRestSelect}
        className="w-full py-1.5 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-medium"
      >
        ▼ (休符)
      </button>
    </div>
  )
}

function NoteButton({
  note,
  onClick,
  color,
}: {
  note: ShinobueNote
  onClick: () => void
  color: string
}) {
  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded text-white text-sm font-bold ${color} hover:opacity-80 transition-opacity`}
      title={`${note.name} (${note.western})`}
    >
      {note.register === 'daikan' ? note.name : note.name.replace(/^大/, '')}
    </button>
  )
}
