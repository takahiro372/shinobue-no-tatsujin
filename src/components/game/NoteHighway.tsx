import { useRef, useEffect, useCallback, useMemo } from 'react'
import type { GameNote } from '../../types/game'
import type { ShinobueRegister } from '../../types/shinobue'

export interface NoteHighwayProps {
  notes: readonly GameNote[]
  currentTimeMs: number
  /** 表示する時間幅 (ms) 画面幅に何ミリ秒分のノートを表示するか */
  visibleDurationMs?: number
  width?: number
  height?: number
}

// ── 定数 ──

/** 判定ラインの X 位置 (画面幅に対する割合) */
const JUDGE_LINE_X_RATIO = 0.2

const COLORS = {
  bg: '#1A1A1A',
  judgeLine: '#C41E3A',
  judgeLineGlow: 'rgba(196, 30, 58, 0.3)',
  gridLine: 'rgba(255,255,255,0.06)',
  registerBorder: 'rgba(255,255,255,0.12)',
  registerLabel: 'rgba(255,255,255,0.25)',
  ro: '#3B82F6',       // 呂音: 青
  kan: '#22C55E',      // 甲音: 緑
  daikan: '#EF4444',   // 大甲: 赤
  rest: 'rgba(255,255,255,0.1)',
  perfect: '#FFD700',  // 金色
  great: '#FFFFFF',    // 白
  good: '#94A3B8',     // グレー
  miss: '#EF4444',     // 赤
  text: '#FFFFFF',
  textDim: 'rgba(255,255,255,0.5)',
}

const NOTE_HEIGHT = 28

/** Y 軸マージン (px) — 上下端の余白 */
const Y_MARGIN = 20

/** 自動フィット時の MIDI 番号マージン (半音) */
const AUTO_FIT_MIDI_PADDING = 2

/**
 * 篠笛の全音域のおおよその MIDI 範囲 (フォールバック用)
 * 六本調子 筒音 A4=69 〜 八本調子 大甲四 G7≈103
 */
const FALLBACK_MIN_MIDI = 69  // A4
const FALLBACK_MAX_MIDI = 103 // G7

/**
 * 呂音/甲音/大甲の境界を表す MIDI ノート番号。
 * 調子により異なるため、楽曲内のノートから推定する。
 * ここでは七本調子ベースのデフォルト値。
 *   呂音: B4(71)〜B5(83)
 *   甲音: C#6(85)〜B6(95)
 *   大甲: C#7(97)〜
 * 境界は register の切り替わり点として描画する。
 */

interface PitchRange {
  minMidi: number
  maxMidi: number
}

/** 楽曲内の実際の音域を算出する */
function computePitchRange(notes: readonly GameNote[]): PitchRange {
  let min = Infinity
  let max = -Infinity

  for (const note of notes) {
    if (note.midiNote !== null) {
      if (note.midiNote < min) min = note.midiNote
      if (note.midiNote > max) max = note.midiNote
    }
  }

  if (min === Infinity) {
    // 有音ノートがない場合はフォールバック
    return { minMidi: FALLBACK_MIN_MIDI, maxMidi: FALLBACK_MAX_MIDI }
  }

  // パディングを加えてクランプ
  return {
    minMidi: Math.min(min - AUTO_FIT_MIDI_PADDING, FALLBACK_MIN_MIDI),
    maxMidi: Math.max(max + AUTO_FIT_MIDI_PADDING, min + 6), // 最低6半音の幅を確保
  }
}

/** register の境界 MIDI 番号を楽曲ノートから推定する */
function computeRegisterBoundaries(notes: readonly GameNote[]): number[] {
  // 各 register の最小 MIDI を集める
  const registerMin: Partial<Record<ShinobueRegister, number>> = {}
  for (const note of notes) {
    if (note.midiNote === null || note.register === null) continue
    const prev = registerMin[note.register]
    if (prev === undefined || note.midiNote < prev) {
      registerMin[note.register] = note.midiNote
    }
  }

  const boundaries: number[] = []
  // 甲音の最小 MIDI が呂音/甲音の境界
  if (registerMin.kan !== undefined) {
    boundaries.push(registerMin.kan)
  }
  // 大甲の最小 MIDI が甲音/大甲の境界
  if (registerMin.daikan !== undefined) {
    boundaries.push(registerMin.daikan)
  }

  return boundaries
}

/** MIDI → Y 座標 (高い音 = 上) */
function midiToY(
  midi: number,
  range: PitchRange,
  canvasHeight: number,
): number {
  const usableHeight = canvasHeight - 2 * Y_MARGIN - NOTE_HEIGHT
  const midiRange = range.maxMidi - range.minMidi
  if (midiRange <= 0) return canvasHeight / 2 - NOTE_HEIGHT / 2
  const normalizedY = 1 - (midi - range.minMidi) / midiRange
  return Y_MARGIN + normalizedY * usableHeight
}

/**
 * ノートハイウェイ Canvas コンポーネント
 *
 * 横スクロール型の譜面表示。
 * - 右から左へノートが流れる
 * - Y軸は音程の高さ（楽曲の音域に自動フィット）
 * - 判定ライン: 画面左 20% の位置
 * - 呂音/甲音/大甲の境界に区切り線を表示
 */
export function NoteHighway({
  notes,
  currentTimeMs,
  visibleDurationMs = 4000,
  width = 800,
  height = 300,
}: NoteHighwayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 楽曲の音域を一度だけ計算 (notes 参照が変わった時のみ)
  const pitchRange = useMemo(() => computePitchRange(notes), [notes])
  const registerBoundaries = useMemo(() => computeRegisterBoundaries(notes), [notes])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = width
    canvas.height = height

    const judgeLineX = width * JUDGE_LINE_X_RATIO
    // 時間→X座標: 判定ラインが currentTimeMs に対応
    const pxPerMs = (width - judgeLineX) / visibleDurationMs

    // 背景
    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, width, height)

    // レジスター境界線
    drawRegisterBoundaries(ctx, registerBoundaries, pitchRange, width, height)

    // 背景グリッドライン (拍)
    drawBeatGrid(ctx, currentTimeMs, visibleDurationMs, judgeLineX, pxPerMs, width, height)

    // ノート描画 (カリング)
    const viewStartMs = currentTimeMs - (judgeLineX / pxPerMs)
    const viewEndMs = currentTimeMs + visibleDurationMs

    for (const note of notes) {
      const noteEndMs = note.timeMs + note.durationMs
      // 画面外のノートはスキップ
      if (noteEndMs < viewStartMs || note.timeMs > viewEndMs) continue
      drawNote(ctx, note, currentTimeMs, judgeLineX, pxPerMs, height, pitchRange)
    }

    // 判定ライン
    drawJudgeLine(ctx, judgeLineX, height)

  }, [notes, currentTimeMs, visibleDurationMs, width, height, pitchRange, registerBoundaries])

  useEffect(() => {
    draw()
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="block rounded-lg"
      style={{ background: COLORS.bg }}
    />
  )
}

// ── 描画関数 ──

function drawJudgeLine(ctx: CanvasRenderingContext2D, x: number, height: number): void {
  // グロー
  ctx.save()
  ctx.shadowColor = COLORS.judgeLineGlow
  ctx.shadowBlur = 20
  ctx.strokeStyle = COLORS.judgeLine
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x, 0)
  ctx.lineTo(x, height)
  ctx.stroke()
  ctx.restore()

  // メインライン
  ctx.strokeStyle = COLORS.judgeLine
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, 0)
  ctx.lineTo(x, height)
  ctx.stroke()
}

function drawRegisterBoundaries(
  ctx: CanvasRenderingContext2D,
  boundaries: number[],
  range: PitchRange,
  width: number,
  canvasHeight: number,
): void {
  const labels = ['甲', '大甲']

  ctx.save()
  ctx.setLineDash([6, 4])
  ctx.lineWidth = 1

  for (let i = 0; i < boundaries.length; i++) {
    const midi = boundaries[i]!
    // 境界線は該当 register の最低音の位置 (ノート下端) に描画
    const y = midiToY(midi, range, canvasHeight) + NOTE_HEIGHT + 2

    // 範囲外ならスキップ
    if (y < 0 || y > canvasHeight) continue

    ctx.strokeStyle = COLORS.registerBorder
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()

    // ラベル
    ctx.fillStyle = COLORS.registerLabel
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText(labels[i]!, 4, y - 2)
  }

  ctx.restore()
}

function drawBeatGrid(
  ctx: CanvasRenderingContext2D,
  currentTimeMs: number,
  visibleDurationMs: number,
  judgeLineX: number,
  pxPerMs: number,
  width: number,
  height: number,
): void {
  ctx.strokeStyle = COLORS.gridLine
  ctx.lineWidth = 1

  // 500ms 刻み (BPM 120 で1拍 = 500ms を想定)
  const gridIntervalMs = 500
  const startMs = Math.floor((currentTimeMs - judgeLineX / pxPerMs) / gridIntervalMs) * gridIntervalMs

  for (let t = startMs; t < currentTimeMs + visibleDurationMs; t += gridIntervalMs) {
    const x = judgeLineX + (t - currentTimeMs) * pxPerMs
    if (x < 0 || x > width) continue
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
}

function drawNote(
  ctx: CanvasRenderingContext2D,
  note: GameNote,
  currentTimeMs: number,
  judgeLineX: number,
  pxPerMs: number,
  canvasHeight: number,
  range: PitchRange,
): void {
  const x = judgeLineX + (note.timeMs - currentTimeMs) * pxPerMs
  const noteWidth = Math.max(4, note.durationMs * pxPerMs - 2)

  // 休符
  if (note.frequency === null) {
    const y = canvasHeight / 2 - NOTE_HEIGHT / 2
    ctx.fillStyle = COLORS.rest
    ctx.fillRect(x, y, noteWidth, NOTE_HEIGHT)
    return
  }

  // Y 座標: 楽曲の音域にフィットしたマッピング
  const midi = note.midiNote ?? 71
  const y = midiToY(midi, range, canvasHeight)

  // 判定済みの色
  let color = getRegisterColor(note.register)
  let alpha = 1.0

  if (note.judged && note.judgement) {
    switch (note.judgement.type) {
      case 'perfect':
        color = COLORS.perfect
        break
      case 'great':
        color = COLORS.great
        break
      case 'good':
        color = COLORS.good
        break
      case 'miss':
        color = COLORS.miss
        alpha = Math.max(0, 1 - (currentTimeMs - note.timeMs) / 1000)
        break
    }
  }

  ctx.save()
  ctx.globalAlpha = alpha

  // ノート本体 (角丸矩形)
  ctx.fillStyle = color
  roundRect(ctx, x, y, noteWidth, NOTE_HEIGHT, 4)
  ctx.fill()

  // ノートのテキストラベル (篠笛音名を表示)
  const label = note.shinobueName ?? note.western
  if (noteWidth > 20 && label) {
    ctx.fillStyle = note.judged ? '#000' : '#FFF'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x + noteWidth / 2, y + NOTE_HEIGHT / 2)
  }

  ctx.restore()
}

function getRegisterColor(register: ShinobueRegister | null): string {
  switch (register) {
    case 'ro': return COLORS.ro
    case 'kan': return COLORS.kan
    case 'daikan': return COLORS.daikan
    default: return COLORS.rest
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
