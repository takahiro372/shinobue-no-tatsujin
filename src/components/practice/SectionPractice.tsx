import { useCallback, useEffect, useRef, useState } from 'react'
import { useSectionPractice } from '../../hooks/useSectionPractice'
import { usePracticeStore } from '../../store/practiceStore'
import { useSettingsStore } from '../../store/settingsStore'
import { PitchMeter } from '../game/PitchMeter'
import { FingeringDiagram } from '../game/FingerChart'
import { savePracticeRecord, generateRecordId } from '../../utils/practiceStorage'
import { getSongs } from '../../utils/songStorage'
import { createDemoScore } from './demoScore'
import type { SavedSong } from '../../utils/songStorage'
import type { ClassifiedNote } from '../../types/shinobue'
import type { PitchResult } from '../../types/music'

interface SectionPracticeProps {
  classifiedNote: ClassifiedNote | null
  pitchResult: PitchResult | null
  isRunning: boolean
}

const TEMPO_SCALE_OPTIONS = [
  { value: 0.5, label: '50%' },
  { value: 0.75, label: '75%' },
  { value: 1.0, label: '100%' },
]

export function SectionPractice({ classifiedNote, pitchResult, isRunning }: SectionPracticeProps) {
  const { shinobueKey } = useSettingsStore()
  const { sectionConfig, setSectionConfig, sectionScore, setSectionScore } = usePracticeStore()
  const section = useSectionPractice()
  const rafRef = useRef(0)
  const pitchResultRef = useRef(pitchResult)
  const [librarySongs, setLibrarySongs] = useState<SavedSong[]>([])

  useEffect(() => {
    pitchResultRef.current = pitchResult
  }, [pitchResult])

  // ライブラリから保存済み楽曲を読み込み
  useEffect(() => {
    getSongs().then(setLibrarySongs)
  }, [])

  // デモ曲をロード
  useEffect(() => {
    if (!sectionScore) {
      const demo = createDemoScore(shinobueKey)
      setSectionScore(demo)
      setSectionConfig({
        scoreTitle: demo.metadata.title,
        endMeasure: demo.measures.length,
      })
    }
  }, [shinobueKey, sectionScore, setSectionScore, setSectionConfig])

  // RAF ループで update を呼び出す
  useEffect(() => {
    if (section.status !== 'active') return

    function loop() {
      section.update(pitchResultRef.current)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(rafRef.current)
  }, [section.status, section.update])

  const handleStart = useCallback(() => {
    if (!sectionScore) return
    section.start(sectionScore, sectionConfig)
  }, [sectionScore, sectionConfig, section.start])

  const handleSave = useCallback(async () => {
    if (!section.result) return
    await savePracticeRecord({
      id: generateRecordId(),
      type: 'section',
      date: new Date().toISOString().split('T')[0]!,
      timestamp: Date.now(),
      shinobueKey,
      result: section.result,
    })
  }, [section.result, shinobueKey])

  const maxMeasure = sectionScore?.measures.length ?? 4

  // 設定フォーム
  if (section.status === 'idle') {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-bold theme-text-secondary">区間練習</h3>

        <div className="theme-bg-card rounded-xl theme-shadow-lg p-6 space-y-4">
          {/* 楽譜選択 */}
          <div>
            <label className="block text-sm font-medium theme-text-muted mb-1">楽譜</label>
            <select
              value={sectionScore?.metadata.title === sectionConfig.scoreTitle ? sectionConfig.scoreTitle : ''}
              onChange={(e) => {
                const value = e.target.value
                if (value === '__demo__') {
                  const demo = createDemoScore(shinobueKey)
                  setSectionScore(demo)
                  setSectionConfig({
                    scoreTitle: demo.metadata.title,
                    startMeasure: 1,
                    endMeasure: demo.measures.length,
                  })
                } else {
                  const song = librarySongs.find((s) => s.id === value)
                  if (song) {
                    setSectionScore(song.score)
                    setSectionConfig({
                      scoreTitle: song.title,
                      startMeasure: 1,
                      endMeasure: song.score.measures.length,
                    })
                  }
                }
              }}
              className="w-full border theme-border rounded px-3 py-2 text-sm theme-bg-card theme-text"
            >
              <option value="__demo__">さくらさくら（デモ）</option>
              {librarySongs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.title} ({song.score.measures.length}小節)
                </option>
              ))}
            </select>
          </div>

          {/* 開始/終了小節 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium theme-text-muted mb-1">開始小節</label>
              <input
                type="number"
                min={1}
                max={sectionConfig.endMeasure}
                value={sectionConfig.startMeasure}
                onChange={(e) => setSectionConfig({ startMeasure: Number(e.target.value) })}
                className="w-full border theme-border rounded px-3 py-2 text-sm theme-bg-card theme-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium theme-text-muted mb-1">終了小節</label>
              <input
                type="number"
                min={sectionConfig.startMeasure}
                max={maxMeasure}
                value={sectionConfig.endMeasure}
                onChange={(e) => setSectionConfig({ endMeasure: Number(e.target.value) })}
                className="w-full border theme-border rounded px-3 py-2 text-sm theme-bg-card theme-text"
              />
            </div>
          </div>

          {/* テンポ倍率 */}
          <div>
            <label className="block text-sm font-medium theme-text-muted mb-1">テンポ倍率</label>
            <div className="flex gap-2">
              {TEMPO_SCALE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setSectionConfig({ tempoScale: o.value })}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    sectionConfig.tempoScale === o.value
                      ? 'theme-btn-primary'
                      : 'bg-gray-100 theme-text hover:bg-gray-200'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* ループ数 */}
          <div>
            <label className="block text-sm font-medium theme-text-muted mb-1">
              ループ数: {sectionConfig.loopCount}
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={sectionConfig.loopCount}
              onChange={(e) => setSectionConfig({ loopCount: Number(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* 段階的テンポアップ */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="gradualSpeedUp"
              checked={sectionConfig.gradualSpeedUp}
              onChange={(e) => setSectionConfig({ gradualSpeedUp: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="gradualSpeedUp" className="text-sm theme-text">
              段階的テンポアップ
            </label>
          </div>

          <button
            onClick={handleStart}
            disabled={!isRunning || !sectionScore}
            className="w-full py-3 theme-btn-primary rounded-lg text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? '開始' : 'マイクを開始してください'}
          </button>
        </div>
      </div>
    )
  }

  // 結果表示
  if (section.status === 'finished' && section.result) {
    const r = section.result
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-bold theme-text-secondary">結果</h3>
        <div className="theme-bg-card rounded-xl theme-shadow-lg p-6 text-center space-y-4">
          <div className="text-5xl font-black theme-text-primary">{r.accuracy}%</div>
          <div className="text-sm theme-text-muted">正解率</div>

          {r.mistakePositions.length > 0 && (
            <div className="text-sm theme-text-muted">
              ミス位置: {r.mistakePositions.map((p) => `#${p + 1}`).join(', ')}
            </div>
          )}

          <div className="flex gap-3 justify-center pt-4">
            <button
              onClick={() => void handleSave()}
              className="px-6 py-2 bg-[var(--color-success)] text-white rounded-lg font-medium hover:brightness-90 transition-all"
            >
              保存
            </button>
            <button
              onClick={section.reset}
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
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold theme-text-secondary">区間練習中</h3>

      <div className="theme-bg-card rounded-xl theme-shadow-lg p-6 text-center space-y-4">
        {/* ループ / テンポ情報 */}
        <div className="flex justify-between text-sm theme-text-muted">
          <span>ループ: {section.currentLoop} / {section.totalLoops}</span>
          <span>テンポ: {sectionConfig.tempoScale * 100}%</span>
        </div>

        {/* ノート進捗 */}
        <div className="text-sm theme-text-muted">
          ノート: {section.currentNoteIndex} / {section.totalNotes}
        </div>

        {/* 現在の音情報 */}
        {classifiedNote && (
          <>
            <div className="text-4xl font-bold theme-text-primary">
              {classifiedNote.shinobueNote.name}
            </div>
            <FingeringDiagram fingering={classifiedNote.shinobueNote.fingering} size="lg" />
          </>
        )}

        {/* 音程メーター */}
        <div className="max-w-md mx-auto">
          <PitchMeter
            centOffset={classifiedNote?.centOffset ?? 0}
            isActive={!!classifiedNote}
          />
        </div>

        {/* 正解率 */}
        <div className="text-lg font-bold">
          正解率: {section.accuracy}% | ミス: {section.mistakes.length}
        </div>

        <button
          onClick={section.stop}
          className="px-6 py-2 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
        >
          中止
        </button>
      </div>
    </div>
  )
}
