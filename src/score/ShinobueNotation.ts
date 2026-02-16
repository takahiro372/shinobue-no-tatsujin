import type { NoteEvent, NotePitch } from './ScoreModel'
import type { ShinobueRegister } from '../types/shinobue'

/**
 * 篠笛の数字譜レンダリング用ユーティリティ
 *
 * 表記ルール:
 * - 呂音: 漢数字 (〇, 一, 二, 三...)
 * - 甲音: アラビア数字 (1, 2, 3...)
 * - 大甲: 大+アラビア数字 (大1, 大2, 大3...)
 * - 休符: 「▼」
 * - 伸ばし（タイ）: 「～」
 * - 付点: 数字の右下に「.」
 * - 八分音符: 数字の下に線1本
 * - 十六分音符: 数字の下に線2本
 */

import { shinobueDisplayName } from '../utils/shinobueNames'

const NUMBER_KANJI = ['〇', '一', '二', '三', '四', '五', '六', '七'] as const

/** 篠笛の音番号から漢数字を取得 (呂音用) */
export function numberToKanji(num: number): string {
  return NUMBER_KANJI[num] ?? String(num)
}

/** 数字譜の表示テキストを取得 */
export function sujiDisplayText(register: ShinobueRegister, num: number): string {
  return shinobueDisplayName(register, num)
}

/** 数字譜の音名テキスト表現 */
export function noteToSujiText(pitch: NotePitch): string {
  return shinobueDisplayName(pitch.register, pitch.shinobueNumber)
}

/** NoteEvent を数字譜テキストに変換 */
export function noteEventToSujiText(event: NoteEvent): string {
  if (event.type === 'rest') return '▼'
  if (event.type === 'tie') return '～'
  if (!event.pitch) return '？'
  return noteToSujiText(event.pitch)
}

/** 音価から描画時の下線本数を取得 */
export function durationUnderlines(durationType: string): number {
  switch (durationType) {
    case 'eighth': return 1
    case 'sixteenth': return 2
    case 'thirty-second': return 3
    default: return 0
  }
}

// ── Canvas 数字譜描画 ──

export interface SujiRenderOptions {
  x: number
  y: number
  cellWidth: number
  cellHeight: number
  fontSize: number
  color?: string
  highlightColor?: string
  isHighlighted?: boolean
}

/** 数字譜の1音を Canvas に描画 */
export function renderSujiNote(
  ctx: CanvasRenderingContext2D,
  event: NoteEvent,
  opts: SujiRenderOptions,
): void {
  const {
    x, y, cellWidth, cellHeight, fontSize,
    color = '#2C2C2C',
    highlightColor = '#C41E3A',
    isHighlighted = false,
  } = opts

  const cx = x + cellWidth / 2
  const cy = y + cellHeight / 2
  const activeColor = isHighlighted ? highlightColor : color

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (event.type === 'rest') {
    ctx.font = `${fontSize}px "Noto Serif JP", serif`
    ctx.fillStyle = activeColor
    ctx.fillText('▼', cx, cy)
    ctx.restore()
    return
  }

  if (event.type === 'tie') {
    ctx.font = `${fontSize}px "Noto Serif JP", serif`
    ctx.fillStyle = activeColor
    ctx.fillText('～', cx, cy)
    ctx.restore()
    return
  }

  if (!event.pitch) {
    ctx.restore()
    return
  }

  const displayText = shinobueDisplayName(event.pitch.register, event.pitch.shinobueNumber)

  // 音名テキスト（メイン）
  ctx.font = `bold ${fontSize}px "Noto Serif JP", serif`
  ctx.fillStyle = activeColor
  ctx.fillText(displayText, cx, cy)

  // 下線（八分以下）
  const underlines = durationUnderlines(event.duration.type)
  if (underlines > 0) {
    ctx.strokeStyle = activeColor
    ctx.lineWidth = 1.5
    const lineY = cy + fontSize * 0.5
    for (let i = 0; i < underlines; i++) {
      const offset = i * 4
      ctx.beginPath()
      ctx.moveTo(cx - cellWidth * 0.35, lineY + offset)
      ctx.lineTo(cx + cellWidth * 0.35, lineY + offset)
      ctx.stroke()
    }
  }

  // 付点
  if (event.duration.dots > 0) {
    ctx.font = `bold ${fontSize * 0.6}px serif`
    ctx.fillStyle = activeColor
    ctx.fillText('.', cx + cellWidth * 0.3, cy + fontSize * 0.3)
  }

  ctx.restore()
}
