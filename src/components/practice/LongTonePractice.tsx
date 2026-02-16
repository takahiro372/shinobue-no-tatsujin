import { useState, useCallback, useEffect, useRef } from 'react'
import { useLongTone } from '../../hooks/useLongTone'
import { usePracticeStore } from '../../store/practiceStore'
import { useSettingsStore } from '../../store/settingsStore'
import { getFingeringChart } from '../../shinobue/FingeringChart'
import { PitchMeter } from '../game/PitchMeter'
import { FingeringDiagram } from '../game/FingerChart'
import { CountdownOverlay } from '../game/CountdownOverlay'
import { savePracticeRecord, generateRecordId } from '../../utils/practiceStorage'
import type { ClassifiedNote, ShinobueNote, ShinobueRegister } from '../../types/shinobue'

interface LongTonePracticeProps {
  classifiedNote: ClassifiedNote | null
  isRunning: boolean
}

const DURATION_OPTIONS = [5, 10, 15, 30] as const

export function LongTonePractice({ classifiedNote, isRunning }: LongTonePracticeProps) {
  const { shinobueKey } = useSettingsStore()
  const { longToneConfig, setLongToneConfig } = usePracticeStore()
  const longTone = useLongTone()
  const [showCountdown, setShowCountdown] = useState(false)
  const rafRef = useRef(0)
  const classifiedNoteRef = useRef(classifiedNote)

  // classifiedNote の最新値を ref に保持
  useEffect(() => {
    classifiedNoteRef.current = classifiedNote
  }, [classifiedNote])

  const chart = getFingeringChart(shinobueKey)

  // register 別にグループ化
  const grouped = groupByRegister(chart)

  const targetNote = chart.find(
    (n) =>
      n.number === longToneConfig.targetNoteNumber &&
      n.register === longToneConfig.targetRegister,
  ) ?? chart[0]!

  // RAF ループで processFrame を毎フレーム呼び出す
  useEffect(() => {
    if (longTone.status !== 'active') return

    function loop() {
      longTone.processFrame(classifiedNoteRef.current)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(rafRef.current)
  }, [longTone.status, longTone.processFrame])

  const handleStart = useCallback(() => {
    setShowCountdown(true)
  }, [])

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false)
    longTone.start({
      target: targetNote,
      durationMs: longToneConfig.duration * 1000,
      toleranceCents: longToneConfig.toleranceCents,
    })
  }, [longTone.start, targetNote, longToneConfig])

  const handleSave = useCallback(async () => {
    if (!longTone.result) return
    await savePracticeRecord({
      id: generateRecordId(),
      type: 'longTone',
      date: new Date().toISOString().split('T')[0]!,
      timestamp: Date.now(),
      shinobueKey,
      result: longTone.result,
    })
  }, [longTone.result, shinobueKey])

  // 設定フォーム
  if (longTone.status === 'idle' && !showCountdown) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-bold theme-text-secondary">ロングトーン練習</h3>

        <div className="theme-bg-card rounded-xl theme-shadow-lg p-6 space-y-4">
          {/* 目標音選択 */}
          <div>
            <label className="block text-sm font-medium theme-text-muted mb-1">目標音</label>
            <select
              value={`${longToneConfig.targetRegister}-${longToneConfig.targetNoteNumber}`}
              onChange={(e) => {
                const [reg, num] = e.target.value.split('-') as [ShinobueRegister, string]
                setLongToneConfig({
                  targetRegister: reg,
                  targetNoteNumber: Number(num),
                })
              }}
              className="w-full border theme-border rounded px-3 py-2 text-sm theme-bg-card theme-text"
            >
              {Object.entries(grouped).map(([register, notes]) => (
                <optgroup key={register} label={registerLabel(register as ShinobueRegister)}>
                  {notes.map((n) => (
                    <option key={`${n.register}-${n.number}`} value={`${n.register}-${n.number}`}>
                      {n.name} ({n.western})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* 目標時間 */}
          <div>
            <label className="block text-sm font-medium theme-text-muted mb-1">目標時間</label>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setLongToneConfig({ duration: d })}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    longToneConfig.duration === d
                      ? 'theme-btn-primary'
                      : 'bg-gray-100 theme-text hover:bg-gray-200'
                  }`}
                >
                  {d}秒
                </button>
              ))}
            </div>
          </div>

          {/* 許容範囲 */}
          <div>
            <label className="block text-sm font-medium theme-text-muted mb-1">
              許容範囲: {longToneConfig.toleranceCents} cents
            </label>
            <input
              type="range"
              min={5}
              max={30}
              step={5}
              value={longToneConfig.toleranceCents}
              onChange={(e) => setLongToneConfig({ toleranceCents: Number(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* 目標音のプレビュー */}
          <div className="text-center py-4">
            <div className="text-3xl font-bold theme-text-primary mb-2">{targetNote.name}</div>
            <div className="text-lg theme-text-muted mb-3">{targetNote.western}</div>
            <FingeringDiagram fingering={targetNote.fingering} size="lg" />
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

  // カウントダウン
  if (showCountdown) {
    return (
      <div className="relative">
        <CountdownOverlay onComplete={handleCountdownComplete} />
      </div>
    )
  }

  // 結果表示
  if (longTone.status === 'finished' && longTone.result) {
    const r = longTone.result
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-bold theme-text-secondary">結果</h3>
        <div className="theme-bg-card rounded-xl theme-shadow-lg p-6 text-center space-y-4">
          <div className={`text-5xl font-black ${r.success ? 'theme-text-success' : 'theme-text-error'}`}>
            {r.success ? '成功!' : '失敗'}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{r.stability.toFixed(1)}%</div>
              <div className="text-xs theme-text-muted">安定度</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{r.averageDeviation.toFixed(1)}</div>
              <div className="text-xs theme-text-muted">平均偏差 (cents)</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{r.maxDeviation.toFixed(1)}</div>
              <div className="text-xs theme-text-muted">最大偏差 (cents)</div>
            </div>
          </div>
          <div className="flex gap-3 justify-center pt-4">
            <button
              onClick={() => void handleSave()}
              className="px-6 py-2 bg-[var(--color-success)] text-white rounded-lg font-medium hover:brightness-90 transition-all"
            >
              保存
            </button>
            <button
              onClick={longTone.reset}
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
  const progress = (longTone.elapsedMs / (longToneConfig.duration * 1000)) * 100
  const stability = longToneConfig.duration * 1000 > 0
    ? (longTone.inToleranceMs / Math.max(longTone.elapsedMs, 1)) * 100
    : 0

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold theme-text-secondary">ロングトーン練習中</h3>

      <div className="theme-bg-card rounded-xl theme-shadow-lg p-6 text-center space-y-4">
        {/* 目標音 */}
        <div className="text-5xl font-bold theme-text-primary">{targetNote.name}</div>
        <div className="text-xl theme-text-muted">{targetNote.western}</div>

        {/* 運指 */}
        <FingeringDiagram fingering={targetNote.fingering} size="lg" />

        {/* 音程メーター */}
        <div className="max-w-md mx-auto">
          <PitchMeter centOffset={longTone.currentDeviation} isActive={true} />
        </div>

        {/* 時間プログレスバー */}
        <div>
          <div className="text-sm theme-text-muted mb-1">
            {Math.floor(longTone.elapsedMs / 1000)} / {longToneConfig.duration} 秒
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-primary)] transition-all duration-100 rounded-full"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* リアルタイム安定度 */}
        <div className="text-sm theme-text-muted">
          安定度: <span className="font-bold">{stability.toFixed(1)}%</span>
        </div>

        <button
          onClick={longTone.stop}
          className="px-6 py-2 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
        >
          中止
        </button>
      </div>
    </div>
  )
}

function groupByRegister(chart: ShinobueNote[]): Record<string, ShinobueNote[]> {
  const groups: Record<string, ShinobueNote[]> = {}
  for (const note of chart) {
    const key = note.register
    if (!groups[key]) groups[key] = []
    groups[key]!.push(note)
  }
  return groups
}

function registerLabel(register: ShinobueRegister): string {
  switch (register) {
    case 'ro': return '呂音'
    case 'kan': return '甲音'
    case 'daikan': return '大甲音'
  }
}
