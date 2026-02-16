import { useState, useCallback, useRef, lazy, Suspense } from 'react'
import { PracticeScreen } from './components/practice/PracticeScreen'
import { FingerChart } from './components/game/FingerChart'
import { usePitchDetection } from './hooks/usePitchDetection'
import { useSettingsStore } from './store/settingsStore'
import { SHINOBUE_KEYS } from './shinobue/ShinobueConfig'
import type { Score } from './score/ScoreModel'
import type { Difficulty } from './types/music'
import type { Theme } from './store/settingsStore'

const ScoreEditor = lazy(() => import('./components/editor/ScoreEditor').then((m) => ({ default: m.ScoreEditor })))
const GameSelectScreen = lazy(() => import('./components/game/GameSelectScreen').then((m) => ({ default: m.GameSelectScreen })))
const GameScreen = lazy(() => import('./components/game/GameScreen').then((m) => ({ default: m.GameScreen })))

type Screen = 'practice' | 'fingering' | 'editor' | 'game'

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'ライト' },
  { value: 'dark', label: 'ダーク' },
  { value: 'traditional', label: '和風' },
]

function LoadingFallback() {
  return <div className="text-center py-12 theme-text-muted">読み込み中...</div>
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('practice')
  const { shinobueKey, setShinobueKey, theme, setTheme } = useSettingsStore()

  // ゲームモード用の状態
  const [gameScore, setGameScore] = useState<Score | null>(null)
  const [gameDifficulty, setGameDifficulty] = useState<Difficulty>('intermediate')
  const [isPlaying, setIsPlaying] = useState(false)

  // エディタの未保存状態
  const editorDirtyRef = useRef(false)
  const handleEditorDirtyChange = useCallback((dirty: boolean) => {
    editorDirtyRef.current = dirty
  }, [])

  // タブ切替ガード
  const handleScreenChange = useCallback((newScreen: Screen) => {
    if (screen === 'editor' && editorDirtyRef.current) {
      const ok = window.confirm('楽譜エディタに未保存の変更があります。移動しますか？')
      if (!ok) return
    }
    setScreen(newScreen)
  }, [screen])

  // 音程検出 (ゲームモード + 練習モードで使用)
  const pitch = usePitchDetection()

  const handleGameStart = useCallback(async (score: Score, difficulty: Difficulty) => {
    setGameScore(score)
    setGameDifficulty(difficulty)
    setIsPlaying(true)
    // マイクを起動
    if (!pitch.isRunning) {
      await pitch.start()
    }
  }, [pitch])

  const handleGameBack = useCallback(() => {
    setIsPlaying(false)
    setGameScore(null)
    pitch.stop()
  }, [pitch])

  const tabs: { id: Screen; label: string }[] = [
    { id: 'practice', label: '練習' },
    { id: 'editor', label: '楽譜エディタ' },
    { id: 'game', label: 'ゲーム' },
    { id: 'fingering', label: '運指表' },
  ]

  return (
    <div className="min-h-screen theme-bg theme-text">
      <header className="theme-bg-header theme-text-header px-6 py-4 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-wide">篠笛の達人</h1>
          <div className="flex items-center gap-3">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
              className="bg-white/20 border border-white/30 rounded px-2 py-1 text-sm theme-text-header"
              aria-label="テーマ選択"
            >
              {THEME_OPTIONS.map((t) => (
                <option key={t.value} value={t.value} className="text-black">
                  {t.label}
                </option>
              ))}
            </select>
            <select
              value={shinobueKey}
              onChange={(e) => setShinobueKey(e.target.value)}
              className="bg-white/20 border border-white/30 rounded px-3 py-1 text-sm theme-text-header"
            >
              {Object.entries(SHINOBUE_KEYS).map(([key, config]) => (
                <option key={key} value={key} className="text-black">
                  {config.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {!isPlaying && (
        <nav className="theme-bg-nav border-b theme-border responsive-tabs">
          <div className="max-w-5xl mx-auto flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleScreenChange(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  screen === tab.id
                    ? 'theme-text-primary border-current'
                    : 'border-transparent theme-text-muted hover:theme-text'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      <main className="max-w-5xl mx-auto p-6 responsive-main">
        <Suspense fallback={<LoadingFallback />}>
          {isPlaying && gameScore ? (
            <GameScreen
              score={gameScore}
              difficulty={gameDifficulty}
              pitchResult={pitch.pitchResult}
              onBack={handleGameBack}
            />
          ) : (
            <>
              {screen === 'practice' && <PracticeScreen pitch={pitch} />}
              {screen === 'editor' && <ScoreEditor onDirtyChange={handleEditorDirtyChange} />}
              {screen === 'game' && <GameSelectScreen onStart={handleGameStart} />}
              {screen === 'fingering' && <FingerChart shinobueKey={shinobueKey} />}
            </>
          )}
        </Suspense>
      </main>
    </div>
  )
}
