import { useCallback, useEffect, useRef } from 'react'
import { useScalePractice } from '../../hooks/useScalePractice'
import { usePracticeStore } from '../../store/practiceStore'
import { useSettingsStore } from '../../store/settingsStore'
import { getFingeringChart } from '../../shinobue/FingeringChart'
import { createMetronome } from '../../utils/metronome'
import { PitchMeter } from '../game/PitchMeter'
import { FingeringDiagram } from '../game/FingerChart'
import { savePracticeRecord, generateRecordId } from '../../utils/practiceStorage'
import type { ClassifiedNote, ShinobueRegister } from '../../types/shinobue'
import type { ScalePattern } from '../../types/practice'

interface ScalePracticeProps {
  classifiedNote: ClassifiedNote | null
  isRunning: boolean
}

const PATTERN_OPTIONS: { value: ScalePattern; label: string }[] = [
  { value: 'ascending', label: '上行' },
  { value: 'descending', label: '下行' },
  { value: 'skip', label: '1つ飛び' },
  { value: 'random', label: 'ランダム' },
]

const REGISTER_OPTIONS: { value: ShinobueRegister | 'all'; label: string }[] = [
  { value: 'all', label: '全音域' },
  { value: 'ro', label: '呂音' },
  { value: 'kan', label: '甲音' },
  { value: 'daikan', label: '大甲音' },
]

export function ScalePractice({ classifiedNote, isRunning }: ScalePracticeProps) {
  const { shinobueKey } = useSettingsStore()
  const { scaleConfig, setScaleConfig } = usePracticeStore()
  const scale = useScalePractice()
  const metronomeRef = useRef(createMetronome())
  const classifiedNoteRef = useRef(classifiedNote)

  // classifiedNote の最新値を ref に保持
  useEffect(() => {
    classifiedNoteRef.current = classifiedNote
  }, [classifiedNote])

  // メトロノームのビートで processNote を呼ぶ
  useEffect(() => {
    if (scale.status !== 'active' || !scaleConfig.metronomeEnabled) return

    const metro = metronomeRef.current
    metro.onBeat(() => {
      scale.processNote(classifiedNoteRef.current)
    })

    return () => {
      metro.onBeat(() => {})
    }
  }, [scale.status, scaleConfig.metronomeEnabled, scale.processNote])

  // アンマウント時にメトロノームを確実に停止
  useEffect(() => {
    return () => {
      metronomeRef.current.stop()
    }
  }, [])

  const handleStart = useCallback(() => {
    const c = getFingeringChart(shinobueKey)
    scale.start(c, scaleConfig)

    if (scaleConfig.metronomeEnabled) {
      metronomeRef.current.start(scaleConfig.tempo)
    }
  }, [shinobueKey, scaleConfig, scale.start])

  const handleManualAdvance = useCallback(() => {
    if (!scaleConfig.metronomeEnabled && scale.status === 'active') {
      scale.processNote(classifiedNote)
    }
  }, [scaleConfig.metronomeEnabled, scale.status, scale.processNote, classifiedNote])

  // 練習完了時にメトロノームを停止
  useEffect(() => {
    if (scale.status === 'finished') {
      metronomeRef.current.stop()
    }
  }, [scale.status])

  const handleStop = useCallback(() => {
    scale.stop()
    metronomeRef.current.stop()
  }, [scale.stop])

  const handleSave = useCallback(async () => {
    if (!scale.result) return
    await savePracticeRecord({
      id: generateRecordId(),
      type: 'scale',
      date: new Date().toISOString().split('T')[0]!,
      timestamp: Date.now(),
      shinobueKey,
      result: scale.result,
    })
  }, [scale.result, shinobueKey])

  // 設定フォーム
  if (scale.status === 'idle') {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-bold theme-text-secondary">音階練習</h3>

        <div className="theme-bg-card rounded-xl theme-shadow-lg p-6 space-y-4">
          {/* パターン選択 */}
          <div>
            <label className="block text-sm font-medium theme-text-muted mb-1">パターン</label>
            <div className="flex gap-2 flex-wrap">
              {PATTERN_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setScaleConfig({ pattern: p.value })}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    scaleConfig.pattern === p.value
                      ? 'theme-btn-primary'
                      : 'bg-gray-100 theme-text hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* テンポスライダー */}
          <div>
            <label className="block text-sm font-medium theme-text-muted mb-1">
              テンポ: {scaleConfig.tempo} BPM
            </label>
            <input
              type="range"
              min={60}
              max={180}
              step={5}
              value={scaleConfig.tempo}
              onChange={(e) => setScaleConfig({ tempo: Number(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* メトロノーム */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="metronome"
              checked={scaleConfig.metronomeEnabled}
              onChange={(e) => setScaleConfig({ metronomeEnabled: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="metronome" className="text-sm theme-text">
              メトロノーム ON
            </label>
          </div>

          {/* 音域フィルタ */}
          <div>
            <label className="block text-sm font-medium theme-text-muted mb-1">音域</label>
            <div className="flex gap-2 flex-wrap">
              {REGISTER_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setScaleConfig({ registerFilter: r.value })}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    scaleConfig.registerFilter === r.value
                      ? 'bg-[var(--color-secondary)] text-white'
                      : 'bg-gray-100 theme-text hover:bg-gray-200'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!isRunning}
            className="w-full py-3 theme-btn-primary rounded-lg text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? '開始' : 'マイクを開始してください'}
          </button>
        </div>
      </div>
    )
  }

  // 結果表示
  if (scale.status === 'finished' && scale.result) {
    const r = scale.result
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-bold theme-text-secondary">結果</h3>
        <div className="theme-bg-card rounded-xl theme-shadow-lg p-6 space-y-4">
          <div className="text-center">
            <div className="text-5xl font-black theme-text-primary">{r.accuracy}%</div>
            <div className="text-sm theme-text-muted mt-1">正解率</div>
          </div>

          <div className="text-center text-sm theme-text-muted">
            平均応答時間: {r.averageResponseTimeMs}ms
          </div>

          {/* ノート別結果 */}
          <div className="space-y-1">
            {r.noteResults.map((nr, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-3 py-1 rounded text-sm ${
                  nr.isCorrect ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <span className="font-medium">{nr.expectedNote}</span>
                <span className={nr.isCorrect ? 'theme-text-success' : 'theme-text-error'}>
                  {nr.actualNote ?? '---'} ({nr.centOffset > 0 ? '+' : ''}{nr.centOffset}c)
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center pt-4">
            <button
              onClick={() => void handleSave()}
              className="px-6 py-2 bg-[var(--color-success)] text-white rounded-lg font-medium hover:brightness-90 transition-all"
            >
              保存
            </button>
            <button
              onClick={scale.reset}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              リトライ
            </button>
          </div>
        </div>
      </div>
    )
  }

  // アクティブ表示
  const currentNote = scale.noteSequence[scale.currentIndex]
  const nextNote = scale.noteSequence[scale.currentIndex + 1]

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold theme-text-secondary">音階練習中</h3>

      <div className="theme-bg-card rounded-xl theme-shadow-lg p-6 text-center space-y-4">
        {/* 現在の目標音 */}
        {currentNote && (
          <>
            <div className="text-5xl font-bold theme-text-primary">{currentNote.name}</div>
            <div className="text-xl theme-text-muted">{currentNote.western}</div>
            <FingeringDiagram fingering={currentNote.fingering} size="lg" />
          </>
        )}

        {/* 次の音 */}
        {nextNote && (
          <div className="text-sm theme-text-light">
            次: <span className="font-medium">{nextNote.name}</span>
          </div>
        )}

        {/* 進捗ドットインジケータ */}
        <div className="flex justify-center gap-1 flex-wrap">
          {scale.noteSequence.map((_, i) => {
            const result = scale.noteResults[i]
            let color = 'bg-gray-300'
            if (result) {
              color = result.isCorrect ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]'
            } else if (i === scale.currentIndex) {
              color = 'bg-[var(--color-primary)] animate-pulse'
            }
            return <div key={i} className={`w-3 h-3 rounded-full ${color}`} />
          })}
        </div>

        {/* 音程メーター */}
        <div className="max-w-md mx-auto">
          <PitchMeter
            centOffset={classifiedNote?.centOffset ?? 0}
            isActive={!!classifiedNote}
          />
        </div>

        <div className="flex gap-3 justify-center">
          {!scaleConfig.metronomeEnabled && (
            <button
              onClick={handleManualAdvance}
              className="px-6 py-2 bg-[var(--color-secondary)] text-white rounded-lg font-medium hover:brightness-90 transition-all"
            >
              次の音
            </button>
          )}
          <button
            onClick={handleStop}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            中止
          </button>
        </div>
      </div>
    </div>
  )
}
