import { usePracticeStore } from '../../store/practiceStore'
import { TunerView } from './TunerView'
import { LongTonePractice } from './LongTonePractice'
import { ScalePractice } from './ScalePractice'
import { SectionPractice } from './SectionPractice'
import { PracticeDashboard } from './PracticeDashboard'
import type { PitchDetectionState } from '../../hooks/usePitchDetection'
import type { PracticeMode } from '../../types/practice'

interface PracticeScreenProps {
  pitch: PitchDetectionState & {
    start: () => Promise<void>
    stop: () => void
  }
}

const SUB_NAV_ITEMS: { id: PracticeMode; label: string }[] = [
  { id: 'tuner', label: 'チューナー' },
  { id: 'longTone', label: 'ロングトーン' },
  { id: 'scale', label: '音階' },
  { id: 'section', label: '区間' },
  { id: 'dashboard', label: '記録' },
]

export function PracticeScreen({ pitch }: PracticeScreenProps) {
  const { mode, setMode } = usePracticeStore()

  return (
    <div className="space-y-6">
      {/* サブナビゲーション */}
      <div className="flex gap-1 theme-bg-card rounded-lg theme-shadow p-1 responsive-tabs">
        {SUB_NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setMode(item.id)}
            className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
              mode === item.id
                ? 'theme-btn-primary'
                : 'theme-text-muted hover:theme-bg'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* マイク開始/停止ボタン (ダッシュボード以外) */}
      {mode !== 'dashboard' && (
        <div className="flex justify-end">
          {pitch.isRunning ? (
            <button
              onClick={pitch.stop}
              className="px-4 py-1.5 bg-gray-600 text-white rounded-full text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              マイク停止
            </button>
          ) : (
            <button
              onClick={() => void pitch.start()}
              className="px-4 py-1.5 theme-btn-primary rounded-full text-sm font-medium"
            >
              マイク開始
            </button>
          )}
        </div>
      )}

      {/* モード切り替え */}
      {mode === 'tuner' && <TunerView pitch={pitch} />}
      {mode === 'longTone' && (
        <LongTonePractice
          classifiedNote={pitch.classifiedNote}
          isRunning={pitch.isRunning}
        />
      )}
      {mode === 'scale' && (
        <ScalePractice
          classifiedNote={pitch.classifiedNote}
          isRunning={pitch.isRunning}
        />
      )}
      {mode === 'section' && (
        <SectionPractice
          classifiedNote={pitch.classifiedNote}
          pitchResult={pitch.pitchResult}
          isRunning={pitch.isRunning}
        />
      )}
      {mode === 'dashboard' && <PracticeDashboard />}
    </div>
  )
}
