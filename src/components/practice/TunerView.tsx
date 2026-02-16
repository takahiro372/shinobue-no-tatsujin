import { usePitchDetection, type PitchDetectionState, type RawDetectionData } from '../../hooks/usePitchDetection'
import { useSettingsStore } from '../../store/settingsStore'
import { PitchMeter } from '../game/PitchMeter'
import { FingeringDiagram } from '../game/FingerChart'
import { NoteClassifier } from '../../audio/NoteClassifier'
import { useRef, useMemo } from 'react'

interface TunerViewProps {
  /** 外部から渡された場合はそれを使い、なければ内部で usePitchDetection を呼ぶ */
  pitch?: PitchDetectionState & {
    start: () => Promise<void>
    stop: () => void
  }
}

/**
 * チューナーモード
 *
 * リアルタイムで音程を検出し、
 * 篠笛の音名・セント偏差・運指を表示する。
 */
export function TunerView({ pitch: externalPitch }: TunerViewProps = {}) {
  const {
    shinobueKey, tuningA4, setTuningA4,
    noiseGate, setNoiseGate,
    pitchConfidenceThreshold, setPitchConfidenceThreshold,
    showDebugPanel, setShowDebugPanel,
  } = useSettingsStore()
  const internalPitch = usePitchDetection()
  const pitch = externalPitch ?? internalPitch
  const useExternal = !!externalPitch
  const classifierRef = useRef(new NoteClassifier(shinobueKey))

  // shinobueKey が変わったら更新
  useMemo(() => {
    classifierRef.current.setKey(shinobueKey)
  }, [shinobueKey])

  // findNearest で最も近い音を表示（classify の 50cent 制限なし）
  const nearestNote = pitch.pitchResult
    ? classifierRef.current.findNearest(pitch.pitchResult.frequency)
    : null

  const isActive = pitch.isRunning && pitch.pitchResult !== null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold theme-text-secondary">チューナー</h2>
        <div className="flex items-center gap-3">
          <label className="text-sm theme-text-muted">
            A4 =
            <input
              type="number"
              value={tuningA4}
              onChange={(e) => setTuningA4(Number(e.target.value))}
              className="w-16 ml-1 px-2 py-1 border theme-border rounded text-center text-sm theme-bg-card theme-text"
              min={420}
              max={460}
              step={1}
            />
            Hz
          </label>
          <button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              showDebugPanel
                ? 'theme-btn-primary border-transparent'
                : 'theme-border theme-text-muted hover:theme-text'
            }`}
          >
            Debug
          </button>
        </div>
      </div>

      {/* デバッグパネル */}
      {showDebugPanel && (
        <DebugPanel
          rawData={pitch.rawData}
          noiseGate={noiseGate}
          setNoiseGate={setNoiseGate}
          confidenceThreshold={pitchConfidenceThreshold}
          setConfidenceThreshold={setPitchConfidenceThreshold}
        />
      )}

      {/* メイン表示 */}
      <div className="theme-bg-card rounded-xl theme-shadow-lg p-8 text-center">
        {pitch.error && (
          <div className="theme-text-error mb-4 p-3 bg-red-50 rounded-lg text-sm">
            {pitch.error}
          </div>
        )}

        {/* 音名 大きく表示 */}
        <div className="mb-6">
          {isActive && nearestNote ? (
            <>
              <div className="text-6xl font-bold theme-text-primary mb-1">
                {nearestNote.note.name}
              </div>
              <div className="text-2xl theme-text-muted">
                {nearestNote.note.western}
              </div>
              <div className="text-sm theme-text-light mt-1">
                {pitch.pitchResult!.frequency.toFixed(1)} Hz
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl font-bold theme-text-light mb-1">---</div>
              <div className="text-2xl theme-text-light">---</div>
              <div className="text-sm theme-text-light mt-1">--- Hz</div>
            </>
          )}
        </div>

        {/* 音程メーター */}
        <div className="max-w-md mx-auto mb-6">
          <PitchMeter
            centOffset={nearestNote?.centOffset ?? 0}
            isActive={isActive}
          />
        </div>

        {/* 運指表示 */}
        {isActive && nearestNote && (
          <div className="mb-6">
            <div className="text-sm theme-text-muted mb-2">運指</div>
            <FingeringDiagram fingering={nearestNote.note.fingering} size="lg" />
          </div>
        )}

        {/* 音量メーター */}
        <div className="max-w-md mx-auto">
          <div className="text-xs theme-text-light mb-1">音量</div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-success)] transition-all duration-75 rounded-full"
              style={{
                width: `${Math.max(0, Math.min(100, (pitch.volume + 60) * (100 / 60)))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 開始/停止ボタン (外部 pitch 時は非表示) */}
      {!useExternal && (
        <div className="text-center">
          {pitch.isRunning ? (
            <button
              onClick={pitch.stop}
              className="px-8 py-3 bg-gray-600 text-white rounded-full text-lg font-medium hover:bg-gray-700 transition-colors"
            >
              停止
            </button>
          ) : (
            <button
              onClick={() => void pitch.start()}
              className="px-8 py-3 theme-btn-primary rounded-full text-lg font-medium theme-shadow-lg"
            >
              マイク開始
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** デバッグパネル */
function DebugPanel({
  rawData,
  noiseGate,
  setNoiseGate,
  confidenceThreshold,
  setConfidenceThreshold,
}: {
  rawData: RawDetectionData
  noiseGate: number
  setNoiseGate: (db: number) => void
  confidenceThreshold: number
  setConfidenceThreshold: (t: number) => void
}) {
  const volumePercent = Math.max(0, Math.min(100, (rawData.volume + 60) * (100 / 60)))

  return (
    <div className="theme-bg-card rounded-xl theme-shadow p-4 space-y-3 font-mono text-xs border-2 border-dashed border-yellow-500/50">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm font-sans theme-text-warning">Debug Panel</span>
        <span className="theme-text-muted font-sans">SR: {rawData.sampleRate} Hz</span>
      </div>

      {/* 音量レベル (dBメーター) */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="theme-text-muted">Volume</span>
          <span className={rawData.noiseGateActive ? 'theme-text-error' : 'theme-text'}>
            {rawData.volume === -Infinity ? '-∞' : rawData.volume.toFixed(1)} dB
            {rawData.noiseGateActive && ' [GATE]'}
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden relative">
          {/* ノイズゲートライン */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
            style={{ left: `${Math.max(0, Math.min(100, (noiseGate + 60) * (100 / 60)))}%` }}
            title={`Noise Gate: ${noiseGate} dB`}
          />
          <div
            className={`h-full rounded-full transition-all duration-75 ${
              rawData.noiseGateActive ? 'bg-red-400' : 'bg-green-500'
            }`}
            style={{ width: `${volumePercent}%` }}
          />
        </div>
      </div>

      {/* 生の周波数 */}
      <div className="flex justify-between">
        <span className="theme-text-muted">Raw Frequency</span>
        <span className="theme-text">
          {rawData.rawFrequency !== null ? `${rawData.rawFrequency.toFixed(1)} Hz` : '---'}
        </span>
      </div>

      {/* Confidence */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="theme-text-muted">Confidence</span>
          <span className={rawData.belowConfidence ? 'theme-text-warning' : 'theme-text'}>
            {rawData.rawConfidence !== null ? rawData.rawConfidence.toFixed(3) : '---'}
            {rawData.belowConfidence && ' [LOW]'}
          </span>
        </div>
        {rawData.rawConfidence !== null && (
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden relative">
            {/* 閾値ライン */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-yellow-500 z-10"
              style={{ left: `${confidenceThreshold * 100}%` }}
            />
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                rawData.belowConfidence ? 'bg-yellow-400' : 'bg-blue-500'
              }`}
              style={{ width: `${rawData.rawConfidence * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* ステータスインジケータ */}
      <div className="flex gap-2 flex-wrap">
        <StatusBadge
          label="Noise Gate"
          active={rawData.noiseGateActive}
          activeColor="bg-red-500"
        />
        <StatusBadge
          label="Low Conf"
          active={rawData.belowConfidence}
          activeColor="bg-yellow-500"
        />
        <StatusBadge
          label="Detecting"
          active={rawData.rawFrequency !== null && !rawData.belowConfidence && !rawData.noiseGateActive}
          activeColor="bg-green-500"
        />
      </div>

      {/* 調整スライダー */}
      <div className="border-t border-gray-300 pt-3 space-y-2 font-sans">
        <div>
          <label className="flex justify-between text-xs theme-text-muted mb-0.5">
            <span>Noise Gate</span>
            <span>{noiseGate} dB</span>
          </label>
          <input
            type="range"
            min={-80}
            max={-10}
            step={1}
            value={noiseGate}
            onChange={(e) => setNoiseGate(Number(e.target.value))}
            className="w-full h-1"
          />
        </div>
        <div>
          <label className="flex justify-between text-xs theme-text-muted mb-0.5">
            <span>Confidence Threshold</span>
            <span>{confidenceThreshold.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min={0.1}
            max={0.95}
            step={0.05}
            value={confidenceThreshold}
            onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
            className="w-full h-1"
          />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ label, active, activeColor }: { label: string; active: boolean; activeColor: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-sans ${
      active ? `${activeColor} text-white` : 'bg-gray-200 theme-text-muted'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : 'bg-gray-400'}`} />
      {label}
    </span>
  )
}
