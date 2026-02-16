import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { Score } from '../../score/ScoreModel'
import type { GameState, GameResult, JudgementResult, DifficultyConfig } from '../../types/game'
import { DIFFICULTY_CONFIGS } from '../../types/game'
import type { Difficulty, PitchResult } from '../../types/music'
import type { ShinobueNote } from '../../types/shinobue'
import { GameEngine } from '../../game/GameEngine'
import { NoteHighway } from './NoteHighway'
import { ScoreBoard } from './ScoreBoard'
import { JudgementDisplay } from './JudgementDisplay'
import { CountdownOverlay } from './CountdownOverlay'
import { ResultScreen } from './ResultScreen'
import { PitchMeter } from './PitchMeter'
import { getFingeringChart } from '../../shinobue/FingeringChart'
import { useSettingsStore } from '../../store/settingsStore'

export interface GameScreenProps {
  score: Score
  difficulty: Difficulty
  /** ユーザーが選択したスクロール速度 */
  scrollSpeed: number
  /** 外部から音程検出結果を受け取る */
  pitchResult: PitchResult | null
  onBack: () => void
}

type Phase = 'countdown' | 'playing' | 'paused' | 'result'

/**
 * ゲーム画面
 *
 * カウントダウン → プレイ → 結果の一連のフローを管理する。
 */
export function GameScreen({ score, difficulty, scrollSpeed, pitchResult, onBack }: GameScreenProps) {
  const [phase, setPhase] = useState<Phase>('countdown')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [lastJudgement, setLastJudgement] = useState<JudgementResult | null>(null)
  const [result, setResult] = useState<GameResult | null>(null)

  const engineRef = useRef<GameEngine | null>(null)
  const rafRef = useRef<number>(0)
  const pitchRef = useRef<PitchResult | null>(null)

  const { shinobueKey } = useSettingsStore()
  const diffConfig: DifficultyConfig = DIFFICULTY_CONFIGS[difficulty]

  // 運指チャートデータ
  const fingeringChart = useMemo(() => getFingeringChart(shinobueKey), [shinobueKey])

  // pitchResult を ref に保持 (RAF から参照)
  useEffect(() => {
    pitchRef.current = pitchResult
  }, [pitchResult])

  // ゲームエンジン初期化
  useEffect(() => {
    const engine = new GameEngine(score, difficulty, {
      onJudgement: (judgement, _score, _combo) => {
        setLastJudgement({ ...judgement })
      },
      onFinish: (r) => {
        setResult(r)
        setPhase('result')
      },
      onStateChange: (state) => {
        setGameState({ ...state })
      },
    })
    engineRef.current = engine

    return () => {
      cancelAnimationFrame(rafRef.current)
      engineRef.current = null
    }
  }, [score, difficulty])

  // ゲームループ
  const gameLoop = useCallback(() => {
    const engine = engineRef.current
    if (!engine || engine.status !== 'playing') return

    const finished = engine.update(pitchRef.current)
    // ゲーム終了時は RAF を停止
    if (!finished) {
      rafRef.current = requestAnimationFrame(gameLoop)
    }
  }, [])

  // カウントダウン完了 → ゲーム開始
  const handleCountdownComplete = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.start()
    setPhase('playing')
    rafRef.current = requestAnimationFrame(gameLoop)
  }, [gameLoop])

  // 一時停止 / 再開
  const togglePause = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return

    if (phase === 'playing') {
      cancelAnimationFrame(rafRef.current)
      engine.pause()
      setPhase('paused')
    } else if (phase === 'paused') {
      engine.resume()
      setPhase('playing')
      rafRef.current = requestAnimationFrame(gameLoop)
    }
  }, [phase, gameLoop])

  // リトライ
  const handleRetry = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setResult(null)
    setLastJudgement(null)
    setGameState(null)
    // 新しいエンジンを作り直す
    const engine = new GameEngine(score, difficulty, {
      onJudgement: (judgement) => {
        setLastJudgement({ ...judgement })
      },
      onFinish: (r) => {
        setResult(r)
        setPhase('result')
      },
      onStateChange: (s) => {
        setGameState({ ...s })
      },
    })
    engineRef.current = engine
    setPhase('countdown')
  }, [score, difficulty])

  const currentTime = gameState?.currentTimeMs ?? 0
  const notes = gameState?.notes ?? engineRef.current?.gameNotes ?? []
  const nextNoteIndex = gameState?.nextNoteIndex ?? 0

  // 次に判定するノートの運指を取得
  // nextNoteIndex を依存に含めることで、判定が進むたびに再計算される
  const nextNote = useMemo(() => {
    if (diffConfig.showFingering === 'none') return null
    for (let i = nextNoteIndex; i < notes.length; i++) {
      const note = notes[i]!
      if (!note.judged && note.frequency !== null && note.register !== null && note.shinobueNumber !== null) {
        return note
      }
    }
    return null
  }, [notes, nextNoteIndex, diffConfig.showFingering])

  // 運指チャートから該当する音を検索
  const activeFingeringNote: ShinobueNote | null = useMemo(() => {
    if (!nextNote) return null
    return fingeringChart.find(
      (n) => n.number === nextNote.shinobueNumber && n.register === nextNote.register,
    ) ?? null
  }, [nextNote, fingeringChart])

  // pitchResult の cent offset
  const centOffset = pitchResult?.centOffset ?? 0
  const isPitchActive = !!pitchResult && pitchResult.confidence >= 0.5

  const showFingering = diffConfig.showFingering !== 'none'
  const showPitchMeter = diffConfig.pitchMeterSize !== 'hidden'
  const showBottomPanel = showFingering || showPitchMeter

  // 結果画面 (全 hooks の後に配置 — React hooks ルールを遵守)
  if (phase === 'result' && result) {
    return (
      <div className="bg-[#1A1A1A] rounded-lg p-6">
        <ResultScreen result={result} onRetry={handleRetry} onBack={onBack} />
      </div>
    )
  }

  return (
    <div className="relative bg-[#1A1A1A] rounded-lg overflow-hidden">
      {/* スコアボード */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-white/10">
        <ScoreBoard
          score={gameState?.score ?? 0}
          combo={gameState?.combo ?? 0}
          maxCombo={gameState?.maxCombo ?? 0}
        />
        <div className="flex gap-2">
          {phase === 'playing' || phase === 'paused' ? (
            <button
              onClick={togglePause}
              className="px-4 py-2 text-sm bg-white/10 text-white rounded hover:bg-white/20 transition-colors"
              data-testid="pause-button"
            >
              {phase === 'paused' ? '再開' : '一時停止'}
            </button>
          ) : null}
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm bg-white/10 text-white rounded hover:bg-white/20 transition-colors"
            data-testid="quit-button"
          >
            やめる
          </button>
        </div>
      </div>

      {/* ノートハイウェイ (全幅) */}
      <div className="relative">
        <NoteHighway
          notes={notes}
          currentTimeMs={currentTime}
          scrollSpeed={scrollSpeed}
          height={300}
        />

        {/* 判定表示 */}
        <JudgementDisplay judgement={lastJudgement} />

        {/* カウントダウン */}
        {phase === 'countdown' && (
          <CountdownOverlay onComplete={handleCountdownComplete} />
        )}

        {/* 一時停止オーバーレイ */}
        {phase === 'paused' && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-4xl font-bold text-white">一時停止</span>
          </div>
        )}
      </div>

      {/* 下部パネル: 運指ガイド + 音程メーター */}
      {showBottomPanel && (
        <div
          className="border-t border-white/10 px-6 py-3 flex items-center justify-center gap-8"
          data-testid="game-bottom-panel"
        >
          {/* 音名ガイド */}
          {showFingering && (
            <div className="flex items-center gap-4" data-testid="game-fingering-guide">
              {activeFingeringNote ? (
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {activeFingeringNote.name}
                  </div>
                  <div className="text-xs text-white/40">
                    {activeFingeringNote.western}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-white/30">---</div>
              )}
            </div>
          )}

          {/* 音程メーター */}
          {showPitchMeter && (
            <div
              className={diffConfig.pitchMeterSize === 'large' ? 'w-64' : 'w-40'}
              data-testid="game-pitch-meter"
            >
              <div className="text-xs text-white/50 mb-1 text-center">音程</div>
              <PitchMeter centOffset={centOffset} isActive={isPitchActive} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
