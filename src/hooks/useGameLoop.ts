import { useRef, useCallback, useEffect } from 'react'
import { GameEngine } from '../game/GameEngine'
import type { Score } from '../score/ScoreModel'
import type { GameState, GameResult, JudgementResult } from '../types/game'
import type { Difficulty, PitchResult } from '../types/music'

export interface UseGameLoopOptions {
  score: Score
  difficulty: Difficulty
  onStateChange?: (state: GameState) => void
  onJudgement?: (result: JudgementResult, score: number, combo: number) => void
  onFinish?: (result: GameResult) => void
}

export interface UseGameLoopReturn {
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => void
  /** 毎フレーム呼び出す: 音程検出結果を渡す */
  feedPitch: (pitchResult: PitchResult | null) => void
  getState: () => GameState | null
}

/**
 * ゲームループ Hook
 *
 * GameEngine のライフサイクルを管理し、
 * requestAnimationFrame でフレーム更新を行う。
 */
export function useGameLoop({
  score,
  difficulty,
  onStateChange,
  onJudgement,
  onFinish,
}: UseGameLoopOptions): UseGameLoopReturn {
  const engineRef = useRef<GameEngine | null>(null)
  const rafRef = useRef<number>(0)
  const pitchRef = useRef<PitchResult | null>(null)

  // Engine を初期化
  useEffect(() => {
    engineRef.current = new GameEngine(score, difficulty, {
      onStateChange,
      onJudgement,
      onFinish,
    })
    return () => {
      cancelAnimationFrame(rafRef.current)
      engineRef.current = null
    }
  }, [score, difficulty, onStateChange, onJudgement, onFinish])

  const loop = useCallback(() => {
    const engine = engineRef.current
    if (!engine || engine.status !== 'playing') return

    engine.update(pitchRef.current)
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  const start = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.start()
    rafRef.current = requestAnimationFrame(loop)
  }, [loop])

  const pause = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    engineRef.current?.pause()
  }, [])

  const resume = useCallback(() => {
    engineRef.current?.resume()
    rafRef.current = requestAnimationFrame(loop)
  }, [loop])

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    engineRef.current?.stop()
  }, [])

  const feedPitch = useCallback((pitchResult: PitchResult | null) => {
    pitchRef.current = pitchResult
  }, [])

  const getState = useCallback((): GameState | null => {
    return engineRef.current?.getState() ?? null
  }, [])

  return { start, pause, resume, stop, feedPitch, getState }
}
