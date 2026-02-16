import { create } from 'zustand'
import type { Score } from '../score/ScoreModel'
import type { GameState, GameResult } from '../types/game'
import type { Difficulty } from '../types/music'

type GamePhase = 'select' | 'countdown' | 'playing' | 'result'

interface GameStoreState {
  phase: GamePhase
  score: Score | null
  difficulty: Difficulty
  gameState: GameState | null
  result: GameResult | null

  setPhase: (phase: GamePhase) => void
  setScore: (score: Score) => void
  setDifficulty: (difficulty: Difficulty) => void
  setGameState: (state: GameState) => void
  setResult: (result: GameResult) => void
  reset: () => void
}

export const useGameStore = create<GameStoreState>((set) => ({
  phase: 'select',
  score: null,
  difficulty: 'intermediate',
  gameState: null,
  result: null,

  setPhase: (phase) => set({ phase }),
  setScore: (score) => set({ score }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setGameState: (state) => set({ gameState: state }),
  setResult: (result) => set({ result, phase: 'result' }),
  reset: () => set({ phase: 'select', score: null, gameState: null, result: null }),
}))
