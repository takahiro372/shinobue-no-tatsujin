import type { ShinobueNote } from '../../types/shinobue'
import { getFingeringChart } from '../../shinobue/FingeringChart'

interface FingerChartProps {
  shinobueKey: string
  activeNote?: ShinobueNote | null
}

/**
 * 運指表コンポーネント
 * 7つの指穴の開閉を視覚的に表示
 */
export function FingerChart({ shinobueKey, activeNote }: FingerChartProps) {
  const chart = getFingeringChart(shinobueKey)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold theme-text-secondary">運指表</h2>

      {/* アクティブな音の運指図（大きく表示） */}
      {activeNote && (
        <div className="theme-bg-card rounded-xl theme-shadow p-6 mb-6">
          <div className="text-center mb-4">
            <span className="text-3xl font-bold theme-text-primary">{activeNote.name}</span>
            <span className="text-lg theme-text-muted ml-2">({activeNote.western})</span>
          </div>
          <FingeringDiagram fingering={activeNote.fingering} size="lg" />
        </div>
      )}

      {/* 全音の運指表 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {chart.map((note, i) => (
          <div
            key={`${note.register}-${note.number}-${i}`}
            className={`theme-bg-card rounded-lg theme-shadow-sm p-3 text-center transition-colors ${
              activeNote?.name === note.name
                ? 'ring-2 ring-[var(--color-primary)]'
                : ''
            }`}
          >
            <div className="text-sm font-bold mb-1">
              <span className={getRegisterColor(note.register)}>{note.name}</span>
            </div>
            <div className="text-xs theme-text-muted mb-2">{note.western}</div>
            <FingeringDiagram fingering={note.fingering} size="sm" />
          </div>
        ))}
      </div>
    </div>
  )
}

function getRegisterColor(register: string): string {
  switch (register) {
    case 'ro': return 'theme-text-secondary'
    case 'kan': return 'theme-text-success'
    case 'daikan': return 'theme-text-primary'
    default: return 'theme-text'
  }
}

/**
 * 運指図（7つの穴を視覚的に表示）
 */
export function FingeringDiagram({ fingering, size = 'sm' }: {
  fingering: boolean[]
  size?: 'sm' | 'lg'
}) {
  const holeSize = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5'
  const gap = size === 'lg' ? 'gap-2' : 'gap-1'

  return (
    <div className={`flex justify-center items-center ${gap}`} role="img" aria-label="運指図">
      {fingering.map((closed, i) => (
        <div
          key={i}
          className={`${holeSize} rounded-full border-2 ${
            closed
              ? 'bg-[var(--color-text)] border-[var(--color-text)]'
              : 'theme-bg-card border-gray-400'
          }`}
          aria-label={`${i + 1}穴: ${closed ? '閉' : '開'}`}
        />
      ))}
    </div>
  )
}
