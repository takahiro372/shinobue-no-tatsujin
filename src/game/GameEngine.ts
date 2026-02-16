import type { Score } from '../score/ScoreModel'
import { durationToBeats, beatsPerMeasure } from '../score/ScoreModel'
import type { GameNote, GameState, GameResult, JudgementResult, DifficultyConfig } from '../types/game'
import { DIFFICULTY_CONFIGS } from '../types/game'
import type { Difficulty, PitchResult } from '../types/music'
import { TimingJudge } from './TimingJudge'
import { ScoreCalculator } from './ScoreCalculator'
import { ComboManager } from './ComboManager'
import { centsBetween } from '../utils/frequency'
import { shinobueDisplayName } from '../utils/shinobueNames'

export interface GameEngineCallbacks {
  onJudgement?: (result: JudgementResult, score: number, combo: number) => void
  onStateChange?: (state: GameState) => void
  onFinish?: (result: GameResult) => void
}

/**
 * ゲームエンジン
 *
 * Score を時間軸の GameNote[] に変換し、
 * リアルタイムの音程検出結果と照合して判定を行う。
 */
export class GameEngine {
  private notes: GameNote[] = []
  private judge: TimingJudge
  private scoreCalc = new ScoreCalculator()
  private combo = new ComboManager()
  private diffConfig: DifficultyConfig
  private callbacks: GameEngineCallbacks

  private _status: GameState['status'] = 'idle'
  private startTimeMs = 0
  private pauseTimeMs = 0
  private _currentTimeMs = 0

  /** 判定済みノートのうち、次にチェックすべきインデックス */
  private nextNoteIndex = 0

  constructor(
    _score: Score,
    difficulty: Difficulty = 'intermediate',
    callbacks: GameEngineCallbacks = {},
  ) {
    this.diffConfig = DIFFICULTY_CONFIGS[difficulty]
    this.judge = new TimingJudge(this.diffConfig)
    this.callbacks = callbacks
    this.notes = scoreToGameNotes(_score)
  }

  get status(): GameState['status'] {
    return this._status
  }

  get currentTimeMs(): number {
    return this._currentTimeMs
  }

  get gameNotes(): readonly GameNote[] {
    return this.notes
  }

  get totalPlayableNotes(): number {
    return this.notes.filter((n) => n.frequency !== null).length
  }

  /** ゲームを開始 */
  start(): void {
    this.scoreCalc.reset()
    this.combo.reset()
    this.nextNoteIndex = 0
    for (const note of this.notes) {
      note.judged = false
      note.judgement = null
    }
    this._status = 'playing'
    this.startTimeMs = performance.now()
    this._currentTimeMs = 0
    this.emitState()
  }

  /** 一時停止 */
  pause(): void {
    if (this._status !== 'playing') return
    this._status = 'paused'
    this.pauseTimeMs = performance.now()
    this.emitState()
  }

  /** 再開 */
  resume(): void {
    if (this._status !== 'paused') return
    const pausedDuration = performance.now() - this.pauseTimeMs
    this.startTimeMs += pausedDuration
    this._status = 'playing'
    this.emitState()
  }

  /**
   * フレーム更新 (requestAnimationFrame から呼ぶ)
   *
   * @param pitchResult 現在の音程検出結果 (null = 無音)
   */
  update(pitchResult: PitchResult | null): void {
    if (this._status !== 'playing') return

    this._currentTimeMs = performance.now() - this.startTimeMs

    // 未判定ノートをチェック
    for (let i = this.nextNoteIndex; i < this.notes.length; i++) {
      const note = this.notes[i]!
      if (note.judged) continue

      const timingDelta = this._currentTimeMs - note.timeMs

      // まだ判定ウィンドウに達していないノートはスキップ (以降も同様)
      if (timingDelta < -this.judge.getMaxWindow()) {
        break
      }

      // 判定ウィンドウを通過 → miss
      if (this.judge.isPastJudgementWindow(timingDelta)) {
        this.applyJudgement(note, {
          type: 'miss',
          timingDelta,
          pitchDelta: 0,
          noteId: note.id,
        })
        this.nextNoteIndex = i + 1
        continue
      }

      // 休符はスキップ (判定しない)
      if (note.frequency === null) {
        note.judged = true
        this.nextNoteIndex = i + 1
        continue
      }

      // 判定ウィンドウ内 + 音が出ている場合
      if (pitchResult && pitchResult.confidence >= 0.85 && this.judge.isInJudgementWindow(timingDelta)) {
        const pitchDelta = note.frequency
          ? centsBetween(pitchResult.frequency, note.frequency)
          : 0

        const judgement = this.judge.judge(timingDelta, pitchDelta, note.id)
        this.applyJudgement(note, judgement)
        this.nextNoteIndex = i + 1
        break // 1フレームにつき1判定
      }
    }

    // 全ノート判定済みならゲーム終了
    const lastNote = this.notes[this.notes.length - 1]
    if (lastNote && this._currentTimeMs > lastNote.timeMs + lastNote.durationMs + 1000) {
      this.finish()
    }

    this.emitState()
  }

  /** ゲームを終了 */
  private finish(): void {
    // 未判定のノートを miss にする
    for (const note of this.notes) {
      if (!note.judged && note.frequency !== null) {
        this.applyJudgement(note, {
          type: 'miss',
          timingDelta: Infinity,
          pitchDelta: 0,
          noteId: note.id,
        })
      }
    }

    this._status = 'finished'
    const result = this.scoreCalc.getResult(this.combo.maxCombo, this.totalPlayableNotes)
    this.callbacks.onFinish?.(result)
    this.emitState()
  }

  /** 強制終了 */
  stop(): void {
    this._status = 'finished'
    this.emitState()
  }

  /** 判定を適用 */
  private applyJudgement(note: GameNote, judgement: JudgementResult): void {
    note.judged = true
    note.judgement = judgement
    this.combo.register(judgement.type)
    this.scoreCalc.add(judgement, this.combo.multiplier)
    this.callbacks.onJudgement?.(judgement, this.scoreCalc.score, this.combo.combo)
  }

  /** 現在の状態を取得 */
  getState(): GameState {
    return {
      status: this._status,
      currentTimeMs: this._currentTimeMs,
      score: this.scoreCalc.score,
      combo: this.combo.combo,
      maxCombo: this.combo.maxCombo,
      judgements: this.notes.filter((n) => n.judgement).map((n) => n.judgement!),
      notes: this.notes,
    }
  }

  /** 結果を取得 */
  getResult(): GameResult {
    return this.scoreCalc.getResult(this.combo.maxCombo, this.totalPlayableNotes)
  }

  private emitState(): void {
    this.callbacks.onStateChange?.(this.getState())
  }
}

// ── Score → GameNote[] 変換 ──

/**
 * 楽譜データをゲーム用のタイムライン (GameNote[]) に変換する
 *
 * BPM からノートの開始時刻(ms)と長さ(ms)を計算する。
 */
export function scoreToGameNotes(score: Score): GameNote[] {
  const bpm = score.metadata.tempo
  const msPerBeat = 60000 / bpm
  const bpMeasure = beatsPerMeasure(score.metadata.timeSignature)
  const notes: GameNote[] = []

  for (const measure of score.measures) {
    const measureOffsetBeats = (measure.number - 1) * bpMeasure

    for (const noteEvent of measure.notes) {
      const startBeat = measureOffsetBeats + noteEvent.startBeat
      const durationBeats = durationToBeats(noteEvent.duration)

      const timeMs = startBeat * msPerBeat
      const durationMs = durationBeats * msPerBeat

      const isRest = noteEvent.type === 'rest' || !noteEvent.pitch

      notes.push({
        id: noteEvent.id,
        timeMs,
        durationMs,
        frequency: isRest ? null : noteEvent.pitch!.frequency,
        midiNote: isRest ? null : noteEvent.pitch!.midiNote,
        shinobueNumber: isRest ? null : noteEvent.pitch!.shinobueNumber,
        register: isRest ? null : noteEvent.pitch!.register,
        western: isRest ? null : noteEvent.pitch!.western,
        shinobueName: isRest ? '▼' : shinobueDisplayName(noteEvent.pitch!.register, noteEvent.pitch!.shinobueNumber),
        judgement: null,
        judged: false,
      })
    }
  }

  return notes.sort((a, b) => a.timeMs - b.timeMs)
}
