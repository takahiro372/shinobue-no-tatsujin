import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'
import { createEmptyScore } from '../score/ScoreModel'

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.setState({
      phase: 'select',
      score: null,
      difficulty: 'intermediate',
      gameState: null,
      result: null,
    })
  })

  it('初期状態は select フェーズ', () => {
    const state = useGameStore.getState()
    expect(state.phase).toBe('select')
    expect(state.score).toBeNull()
    expect(state.result).toBeNull()
  })

  it('setPhase でフェーズを変更', () => {
    useGameStore.getState().setPhase('countdown')
    expect(useGameStore.getState().phase).toBe('countdown')
  })

  it('setScore で楽譜を設定', () => {
    const score = createEmptyScore({
      title: 'Test', tempo: 120, timeSignature: [4, 4], measureCount: 1,
    })
    useGameStore.getState().setScore(score)
    expect(useGameStore.getState().score).not.toBeNull()
    expect(useGameStore.getState().score?.metadata.title).toBe('Test')
  })

  it('setDifficulty で難易度を変更', () => {
    useGameStore.getState().setDifficulty('master')
    expect(useGameStore.getState().difficulty).toBe('master')
  })

  it('setResult で結果を設定し、フェーズが result になる', () => {
    useGameStore.getState().setResult({
      score: 5000,
      maxCombo: 10,
      perfectCount: 3,
      greatCount: 2,
      goodCount: 1,
      missCount: 0,
      totalNotes: 6,
      accuracy: 100,
      rank: 'S',
    })
    expect(useGameStore.getState().phase).toBe('result')
    expect(useGameStore.getState().result?.rank).toBe('S')
  })

  it('reset で初期状態に戻る', () => {
    useGameStore.getState().setPhase('playing')
    useGameStore.getState().reset()
    expect(useGameStore.getState().phase).toBe('select')
    expect(useGameStore.getState().score).toBeNull()
    expect(useGameStore.getState().result).toBeNull()
  })
})
