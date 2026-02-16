import { useState, useCallback, useEffect } from 'react'
import { parseMusicXML } from '../../score/ScoreParser'
import { useSettingsStore } from '../../store/settingsStore'
import { getSongs } from '../../utils/songStorage'
import type { SavedSong } from '../../utils/songStorage'
import type { Score } from '../../score/ScoreModel'
import type { Difficulty } from '../../types/music'
import { DIFFICULTY_CONFIGS } from '../../types/game'

export interface GameSelectScreenProps {
  onStart: (score: Score, difficulty: Difficulty, scrollSpeed: number) => void
}

const DIFFICULTIES: { id: Difficulty; label: string; desc: string }[] = [
  { id: 'beginner', label: '入門', desc: '呂音のみ・ゆっくり・判定緩め・運指+音程ガイド' },
  { id: 'intermediate', label: '中級', desc: '呂音+甲音・標準速度・運指+音程ガイド' },
  { id: 'advanced', label: '上級', desc: '全音域・速め・判定厳しめ・装飾音あり' },
  { id: 'master', label: '達人', desc: '全音域・最速・厳密判定・ガイドなし・装飾音あり' },
]

const SCROLL_SPEED_OPTIONS = [
  { value: 0.4, label: 'とても遅い' },
  { value: 0.6, label: '遅い' },
  { value: 0.8, label: 'やや遅い' },
  { value: 1.0, label: 'ふつう' },
  { value: 1.2, label: 'やや速い' },
  { value: 1.4, label: '速い' },
  { value: 1.8, label: 'とても速い' },
  { value: 2.2, label: '最速' },
]

interface SongEntry {
  id: string
  file: string
  title: string
  desc: string
}

const SONG_CATALOG: SongEntry[] = [
  { id: 'sakura', file: '/songs/sakura.musicxml', title: 'さくらさくら', desc: '日本古謡 | 呂音中心の入門曲' },
  { id: 'kojo', file: '/songs/kojo-no-tsuki.musicxml', title: '荒城の月', desc: '滝廉太郎 | 甲音を含む中級曲' },
  { id: 'etenraku', file: '/songs/etenraku.musicxml', title: '越天楽今様', desc: '雅楽 | ゆったりした旋律' },
  { id: 'toryanse', file: '/songs/toryanse.musicxml', title: '通りゃんせ', desc: 'わらべうた | リズミカルな曲' },
  { id: 'scale', file: '/songs/scale-exercise.musicxml', title: '音階練習曲', desc: '基礎練習 | 全音域の練習' },
]

/**
 * ゲーム選択画面
 *
 * サンプル楽曲 + ライブラリの保存済み楽曲から選択。
 */
export function GameSelectScreen({ onStart }: GameSelectScreenProps) {
  const { shinobueKey } = useSettingsStore()
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate')
  const [scrollSpeed, setScrollSpeed] = useState<number>(DIFFICULTY_CONFIGS.intermediate.scrollSpeed)
  const [selectedSong, setSelectedSong] = useState<string>('sakura')
  const [loadedScores, setLoadedScores] = useState<Record<string, Score>>({})
  const [loading, setLoading] = useState(false)
  const [librarySongs, setLibrarySongs] = useState<SavedSong[]>([])

  // 難易度変更時に推奨スクロール速度を設定
  const handleDifficultyChange = useCallback((d: Difficulty) => {
    setDifficulty(d)
    setScrollSpeed(DIFFICULTY_CONFIGS[d].scrollSpeed)
  }, [])

  // ライブラリから保存済み楽曲を読み込み
  useEffect(() => {
    getSongs().then(setLibrarySongs)
  }, [])

  // Load song on selection
  useEffect(() => {
    // ライブラリ曲の場合はスコアを直接セット
    const libSong = librarySongs.find((s) => s.id === selectedSong)
    if (libSong) {
      setLoadedScores((prev) => ({ ...prev, [selectedSong]: libSong.score }))
      return
    }

    // カタログ曲の場合はfetchでロード
    const song = SONG_CATALOG.find((s) => s.id === selectedSong)
    if (!song) return

    let alreadyLoaded = false
    setLoadedScores((prev) => {
      alreadyLoaded = !!prev[selectedSong]
      return prev
    })
    if (alreadyLoaded) return

    const controller = new AbortController()
    setLoading(true)
    fetch(song.file, { signal: controller.signal })
      .then((res) => res.text())
      .then((xml) => {
        if (controller.signal.aborted) return
        const score = parseMusicXML(xml, shinobueKey)
        setLoadedScores((prev) => ({ ...prev, [selectedSong]: score }))
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [selectedSong, shinobueKey, librarySongs])

  const handleStart = useCallback(() => {
    const score = loadedScores[selectedSong]
    if (!score) return
    onStart(score, difficulty, scrollSpeed)
  }, [difficulty, scrollSpeed, selectedSong, loadedScores, onStart])

  const currentScore = loadedScores[selectedSong]

  // 現在のスクロール速度に一致するオプションのラベル
  const currentSpeedLabel = SCROLL_SPEED_OPTIONS.find((o) => o.value === scrollSpeed)?.label
    ?? `x${scrollSpeed.toFixed(1)}`

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <h2 className="text-2xl font-bold theme-text">ゲームモード</h2>

      {/* 楽曲選択 */}
      <div className="theme-bg-card rounded-lg theme-shadow p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-3 theme-text">楽曲を選択</h3>

        {/* サンプル楽曲 */}
        <div className="space-y-2">
          {SONG_CATALOG.map((song) => (
            <button
              key={song.id}
              onClick={() => setSelectedSong(song.id)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                selectedSong === song.id
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                  : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              <div className="font-medium theme-text">{song.title}</div>
              <div className="text-xs theme-text-muted">{song.desc}</div>
            </button>
          ))}
        </div>

        {/* ライブラリ楽曲 */}
        {librarySongs.length > 0 && (
          <>
            <div className="mt-4 mb-2 text-sm font-medium theme-text-muted border-t pt-3">
              ライブラリ
            </div>
            <div className="space-y-2">
              {librarySongs.map((song) => (
                <button
                  key={song.id}
                  onClick={() => setSelectedSong(song.id)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                    selectedSong === song.id
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                      : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
                  }`}
                >
                  <div className="font-medium theme-text">{song.title}</div>
                  <div className="text-xs theme-text-muted">
                    {song.score.measures.length}小節 | BPM {song.score.metadata.tempo}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {currentScore && (
          <div className="mt-3 text-xs theme-text-muted">
            {currentScore.measures.length}小節 | BPM {currentScore.metadata.tempo}
          </div>
        )}
      </div>

      {/* 難易度選択 */}
      <div className="theme-bg-card rounded-lg theme-shadow p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-2 theme-text">難易度</h3>
        <div className="space-y-2">
          {DIFFICULTIES.map((d) => (
            <label
              key={d.id}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border-2 transition-colors ${
                difficulty === d.id
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                  : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              <input
                type="radio"
                name="difficulty"
                value={d.id}
                checked={difficulty === d.id}
                onChange={() => handleDifficultyChange(d.id)}
                className="accent-[var(--color-primary)]"
              />
              <div>
                <div className="font-medium theme-text">{d.label}</div>
                <div className="text-xs theme-text-muted">{d.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* スクロール速度 */}
      <div className="theme-bg-card rounded-lg theme-shadow p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-2 theme-text">スクロール速度</h3>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={SCROLL_SPEED_OPTIONS.length - 1}
            step={1}
            value={SCROLL_SPEED_OPTIONS.findIndex((o) => o.value === scrollSpeed) !== -1
              ? SCROLL_SPEED_OPTIONS.findIndex((o) => o.value === scrollSpeed)
              : SCROLL_SPEED_OPTIONS.findIndex((o) => o.value >= scrollSpeed)}
            onChange={(e) => {
              const idx = Number(e.target.value)
              setScrollSpeed(SCROLL_SPEED_OPTIONS[idx]!.value)
            }}
            className="flex-1 accent-[var(--color-primary)]"
            data-testid="scroll-speed-slider"
          />
          <span className="text-sm font-medium theme-text min-w-[80px] text-center" data-testid="scroll-speed-label">
            {currentSpeedLabel}
          </span>
        </div>
        <div className="flex justify-between text-xs theme-text-muted mt-1">
          <span>遅い</span>
          <span>速い</span>
        </div>
      </div>

      <button
        onClick={handleStart}
        disabled={loading || !currentScore}
        className="px-10 py-4 theme-btn-primary text-lg font-bold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="start-game-button"
      >
        {loading ? '読み込み中...' : 'ゲーム開始'}
      </button>
    </div>
  )
}
