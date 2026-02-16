import type { Score, NoteEvent } from './ScoreModel'
import { renderSujiNote } from './ShinobueNotation'

export type NotationMode = 'western' | 'number' | 'both'

export interface RenderOptions {
  mode: NotationMode
  width: number
  height: number
  notesPerRow: number
  highlightNoteId?: string | null
  selectedNoteId?: string | null
  showMeasureNumbers?: boolean
  staffColor?: string
  noteColor?: string
  restColor?: string
  highlightColor?: string
  selectedColor?: string
}

const DEFAULTS: Required<Omit<RenderOptions, 'highlightNoteId' | 'selectedNoteId'>> = {
  mode: 'number',
  width: 800,
  height: 600,
  notesPerRow: 16,
  showMeasureNumbers: true,
  staffColor: '#999',
  noteColor: '#2C2C2C',
  restColor: '#888',
  highlightColor: '#C41E3A',
  selectedColor: '#1B4F72',
}

// ── 五線譜定数 ──
const STAFF_TOP = 60
const STAFF_LINE_GAP = 10
const STAFF_LINES = 5
const CLEF_WIDTH = 40
const MARGIN_LEFT = 20
const MARGIN_RIGHT = 20
const ROW_HEIGHT = 120
const SUJI_ROW_HEIGHT = 80

// ── メインレンダラー ──

/**
 * Score を Canvas に描画する
 */
export function renderScore(
  ctx: CanvasRenderingContext2D,
  score: Score,
  options: Partial<RenderOptions> = {},
): void {
  const opts = { ...DEFAULTS, ...options } as Required<RenderOptions> & {
    highlightNoteId?: string | null
    selectedNoteId?: string | null
  }

  ctx.clearRect(0, 0, opts.width, opts.height)

  if (opts.mode === 'western' || opts.mode === 'both') {
    renderWesternScore(ctx, score, opts)
  }

  if (opts.mode === 'number') {
    renderSujiScore(ctx, score, opts)
  }

  if (opts.mode === 'both') {
    // 数字譜は五線譜の下に描画
    const staffHeight = calculateStaffRows(score, opts) * ROW_HEIGHT
    ctx.save()
    ctx.translate(0, staffHeight + 20)
    renderSujiScore(ctx, score, opts)
    ctx.restore()
  }
}

/**
 * 必要な Canvas の高さを計算
 */
export function calculateCanvasHeight(score: Score, options: Partial<RenderOptions> = {}): number {
  const opts = { ...DEFAULTS, ...options }
  const staffRows = calculateStaffRows(score, opts)

  if (opts.mode === 'western') {
    return staffRows * ROW_HEIGHT + 40
  }
  if (opts.mode === 'number') {
    return staffRows * SUJI_ROW_HEIGHT + 40
  }
  // both
  return staffRows * ROW_HEIGHT + staffRows * SUJI_ROW_HEIGHT + 60
}

function calculateStaffRows(score: Score, opts: typeof DEFAULTS): number {
  const totalNotes = score.measures.reduce(
    (sum, m) => sum + m.notes.length,
    0,
  )
  return Math.max(1, Math.ceil(totalNotes / opts.notesPerRow))
}

// ── 五線譜描画 ──

function renderWesternScore(
  ctx: CanvasRenderingContext2D,
  score: Score,
  opts: typeof DEFAULTS & { highlightNoteId?: string | null; selectedNoteId?: string | null },
): void {
  let noteIndex = 0
  let row = 0

  for (const measure of score.measures) {
    for (const noteEvent of measure.notes) {
      const col = noteIndex % opts.notesPerRow
      if (col === 0 && noteIndex > 0) {
        row++
      }

      const rowY = row * ROW_HEIGHT
      const availableWidth = opts.width - MARGIN_LEFT - MARGIN_RIGHT - CLEF_WIDTH
      const cellWidth = availableWidth / opts.notesPerRow
      const x = MARGIN_LEFT + CLEF_WIDTH + col * cellWidth

      // 行の最初に五線を描画
      if (col === 0) {
        drawStaffLines(ctx, MARGIN_LEFT, rowY + STAFF_TOP, opts.width - MARGIN_RIGHT, opts.staffColor)
        drawClef(ctx, MARGIN_LEFT + 5, rowY + STAFF_TOP, opts.staffColor)
      }

      // 小節線
      if (col === 0 && noteIndex > 0) {
        // 行頭の小節線は省略
      } else if (noteEvent === measure.notes[0] && noteIndex > 0) {
        drawBarline(ctx, x - 2, rowY + STAFF_TOP, measure.barline ?? 'normal', opts.staffColor)
      }

      // ノート描画
      const isHighlighted = noteEvent.id === opts.highlightNoteId
      const isSelected = noteEvent.id === opts.selectedNoteId
      renderWesternNote(ctx, noteEvent, {
        x,
        y: rowY + STAFF_TOP,
        cellWidth,
        staffLineGap: STAFF_LINE_GAP,
        color: isSelected ? (opts.selectedColor ?? '#1B4F72') : opts.noteColor,
        isHighlighted,
        highlightColor: opts.highlightColor,
      })

      noteIndex++
    }

    // 小節の最後の barline
    if (measure.barline === 'final' || measure.barline === 'double') {
      const col = (noteIndex - 1) % opts.notesPerRow
      const rowY = row * ROW_HEIGHT
      const availableWidth = opts.width - MARGIN_LEFT - MARGIN_RIGHT - CLEF_WIDTH
      const cellWidth = availableWidth / opts.notesPerRow
      const x = MARGIN_LEFT + CLEF_WIDTH + (col + 1) * cellWidth
      drawBarline(ctx, x, rowY + STAFF_TOP, measure.barline, opts.staffColor)
    }
  }
}

interface WesternNoteOpts {
  x: number
  y: number
  cellWidth: number
  staffLineGap: number
  color: string
  isHighlighted: boolean
  highlightColor: string
}

function renderWesternNote(
  ctx: CanvasRenderingContext2D,
  event: NoteEvent,
  opts: WesternNoteOpts,
): void {
  const cx = opts.x + opts.cellWidth / 2
  const color = opts.isHighlighted ? opts.highlightColor : opts.color

  if (event.type === 'rest') {
    // 休符記号
    ctx.save()
    ctx.font = '16px serif'
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const restY = opts.y + opts.staffLineGap * 2
    const restSymbol = getRestSymbol(event.duration.type)
    ctx.fillText(restSymbol, cx, restY)
    ctx.restore()
    return
  }

  if (!event.pitch) return

  // MIDIノート番号から五線上の位置を計算
  // B4 (MIDI 59) をト音記号の第3線とする
  const noteY = midiNoteToStaffY(event.pitch.midiNote, opts.y, opts.staffLineGap)

  // 加線
  drawLedgerLines(ctx, cx, noteY, opts.y, opts.staffLineGap, opts.color)

  // 符頭
  ctx.save()
  ctx.fillStyle = color
  ctx.strokeStyle = color
  const filled = event.duration.type !== 'whole' && event.duration.type !== 'half'
  drawNoteHead(ctx, cx, noteY, filled)

  // 符幹
  if (event.duration.type !== 'whole') {
    const stemUp = noteY > opts.y + opts.staffLineGap * 2
    const stemX = stemUp ? cx + 5 : cx - 5
    const stemEndY = stemUp ? noteY - opts.staffLineGap * 3 : noteY + opts.staffLineGap * 3
    ctx.beginPath()
    ctx.moveTo(stemX, noteY)
    ctx.lineTo(stemX, stemEndY)
    ctx.lineWidth = 1.2
    ctx.stroke()

    // 旗（八分以下）
    const flagCount = getFlagCount(event.duration.type)
    if (flagCount > 0) {
      for (let i = 0; i < flagCount; i++) {
        const flagY = stemUp
          ? stemEndY + i * 6
          : stemEndY - i * 6
        ctx.beginPath()
        ctx.moveTo(stemX, flagY)
        ctx.quadraticCurveTo(
          stemX + (stemUp ? 10 : -10),
          flagY + (stemUp ? 8 : -8),
          stemX + (stemUp ? 2 : -2),
          flagY + (stemUp ? 15 : -15),
        )
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
    }
  }

  // 付点
  if (event.duration.dots > 0) {
    for (let i = 0; i < event.duration.dots; i++) {
      ctx.beginPath()
      ctx.arc(cx + 8 + i * 5, noteY - 2, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}

function midiNoteToStaffY(midiNote: number, staffTop: number, gap: number): number {
  // ト音記号: 第1線 = E4 (MIDI 64), 第5線 = F5 (MIDI 77)
  // 各線/間はダイアトニック間隔
  // B4 (MIDI 71) = 第3線
  const diatonicSteps = midiToDiatonicSteps(midiNote)
  const b4Steps = midiToDiatonicSteps(71)
  const staffMiddle = staffTop + gap * 2 // 第3線
  return staffMiddle - (diatonicSteps - b4Steps) * (gap / 2)
}

function midiToDiatonicSteps(midi: number): number {
  const octave = Math.floor(midi / 12)
  const pc = midi % 12
  const diatonicMap = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]
  return octave * 7 + (diatonicMap[pc] ?? 0)
}

function drawNoteHead(ctx: CanvasRenderingContext2D, x: number, y: number, filled: boolean): void {
  ctx.beginPath()
  ctx.ellipse(x, y, 5, 4, -0.3, 0, Math.PI * 2)
  if (filled) {
    ctx.fill()
  } else {
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
}

function drawLedgerLines(
  ctx: CanvasRenderingContext2D,
  x: number,
  noteY: number,
  staffTop: number,
  gap: number,
  color: string,
): void {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1

  const bottomLine = staffTop + gap * (STAFF_LINES - 1)

  // 上方の加線
  if (noteY < staffTop) {
    for (let lineY = staffTop - gap; lineY >= noteY - gap / 2; lineY -= gap) {
      ctx.beginPath()
      ctx.moveTo(x - 8, lineY)
      ctx.lineTo(x + 8, lineY)
      ctx.stroke()
    }
  }
  // 下方の加線
  if (noteY > bottomLine) {
    for (let lineY = bottomLine + gap; lineY <= noteY + gap / 2; lineY += gap) {
      ctx.beginPath()
      ctx.moveTo(x - 8, lineY)
      ctx.lineTo(x + 8, lineY)
      ctx.stroke()
    }
  }

  ctx.restore()
}

function getFlagCount(durationType: string): number {
  switch (durationType) {
    case 'eighth': return 1
    case 'sixteenth': return 2
    case 'thirty-second': return 3
    default: return 0
  }
}

function getRestSymbol(durationType: string): string {
  switch (durationType) {
    case 'whole': return '\u{1D13B}'      // 𝄻
    case 'half': return '\u{1D13C}'       // 𝄼
    case 'quarter': return '𝄾'
    case 'eighth': return '𝄿'
    case 'sixteenth': return '𝅀'
    default: return '𝄾'
  }
}

// ── 五線・記号描画 ──

function drawStaffLines(
  ctx: CanvasRenderingContext2D,
  startX: number,
  y: number,
  endX: number,
  color: string,
): void {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 0.8
  for (let i = 0; i < STAFF_LINES; i++) {
    const lineY = y + i * STAFF_LINE_GAP
    ctx.beginPath()
    ctx.moveTo(startX, lineY)
    ctx.lineTo(endX, lineY)
    ctx.stroke()
  }
  ctx.restore()
}

function drawClef(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
): void {
  ctx.save()
  ctx.font = '36px serif'
  ctx.fillStyle = color
  ctx.textBaseline = 'top'
  ctx.fillText('𝄞', x, y - 8)
  ctx.restore()
}

function drawBarline(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: string,
  color: string,
): void {
  ctx.save()
  ctx.strokeStyle = color
  const top = y
  const bottom = y + STAFF_LINE_GAP * (STAFF_LINES - 1)

  switch (type) {
    case 'double':
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x - 3, top)
      ctx.lineTo(x - 3, bottom)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x, top)
      ctx.lineTo(x, bottom)
      ctx.stroke()
      break
    case 'final':
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x - 5, top)
      ctx.lineTo(x - 5, bottom)
      ctx.stroke()
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(x, top)
      ctx.lineTo(x, bottom)
      ctx.stroke()
      break
    case 'repeat-start':
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(x, top)
      ctx.lineTo(x, bottom)
      ctx.stroke()
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + 4, top)
      ctx.lineTo(x + 4, bottom)
      ctx.stroke()
      ctx.fillStyle = color
      const dotY1s = y + STAFF_LINE_GAP * 1.5
      const dotY2s = y + STAFF_LINE_GAP * 2.5
      ctx.beginPath(); ctx.arc(x + 10, dotY1s, 2, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(x + 10, dotY2s, 2, 0, Math.PI * 2); ctx.fill()
      break
    case 'repeat-end':
      ctx.fillStyle = color
      const dotY1e = y + STAFF_LINE_GAP * 1.5
      const dotY2e = y + STAFF_LINE_GAP * 2.5
      ctx.beginPath(); ctx.arc(x - 10, dotY1e, 2, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(x - 10, dotY2e, 2, 0, Math.PI * 2); ctx.fill()
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x - 4, top)
      ctx.lineTo(x - 4, bottom)
      ctx.stroke()
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(x, top)
      ctx.lineTo(x, bottom)
      ctx.stroke()
      break
    default:
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, top)
      ctx.lineTo(x, bottom)
      ctx.stroke()
  }

  ctx.restore()
}

// ── 数字譜描画 ──

function renderSujiScore(
  ctx: CanvasRenderingContext2D,
  score: Score,
  opts: typeof DEFAULTS & { highlightNoteId?: string | null; selectedNoteId?: string | null },
): void {
  let noteIndex = 0
  let row = 0

  const availableWidth = opts.width - MARGIN_LEFT - MARGIN_RIGHT
  const cellWidth = availableWidth / opts.notesPerRow
  const cellHeight = SUJI_ROW_HEIGHT - 10
  const fontSize = Math.min(24, cellWidth * 0.6)

  for (const measure of score.measures) {
    for (let i = 0; i < measure.notes.length; i++) {
      const noteEvent = measure.notes[i]!
      const col = noteIndex % opts.notesPerRow
      if (col === 0 && noteIndex > 0) {
        row++
      }

      const x = MARGIN_LEFT + col * cellWidth
      const y = row * SUJI_ROW_HEIGHT + 10

      // 小節番号
      if (opts.showMeasureNumbers && i === 0 && col === 0) {
        ctx.save()
        ctx.font = '10px sans-serif'
        ctx.fillStyle = '#999'
        ctx.textAlign = 'left'
        ctx.fillText(`${measure.number}`, x, y - 2)
        ctx.restore()
      }

      // 小節線
      if (i === 0 && noteIndex > 0) {
        ctx.save()
        ctx.strokeStyle = opts.staffColor
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x - 2, y)
        ctx.lineTo(x - 2, y + cellHeight)
        ctx.stroke()
        ctx.restore()
      }

      const isHighlighted = noteEvent.id === opts.highlightNoteId
      const isSelected = noteEvent.id === opts.selectedNoteId

      renderSujiNote(ctx, noteEvent, {
        x,
        y,
        cellWidth,
        cellHeight,
        fontSize,
        color: isSelected ? (opts.selectedColor ?? '#1B4F72') : noteEvent.type === 'rest' ? opts.restColor : opts.noteColor,
        highlightColor: opts.highlightColor,
        isHighlighted,
      })

      noteIndex++
    }
  }
}
