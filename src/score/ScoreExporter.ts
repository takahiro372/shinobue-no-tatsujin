import type { Score, NoteEvent } from './ScoreModel'
import { durationToBeats } from './ScoreModel'

// ── MusicXML エクスポート ──

/**
 * Score を MusicXML 文字列に変換
 */
export function exportToMusicXML(score: Score): string {
  const divisions = 4 // 四分音符 = 4 divisions (十六分音符まで対応)
  const [beats, beatType] = score.metadata.timeSignature

  const lines: string[] = []
  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push('<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN"')
  lines.push('  "http://www.musicxml.org/dtds/partwise.dtd">')
  lines.push('<score-partwise version="3.1">')

  // Work title
  lines.push('  <work>')
  lines.push(`    <work-title>${escapeXml(score.metadata.title)}</work-title>`)
  lines.push('  </work>')

  // Identification
  lines.push('  <identification>')
  if (score.metadata.composer) {
    lines.push(`    <creator type="composer">${escapeXml(score.metadata.composer)}</creator>`)
  }
  if (score.metadata.arranger) {
    lines.push(`    <creator type="arranger">${escapeXml(score.metadata.arranger)}</creator>`)
  }
  lines.push('  </identification>')

  // Part list
  lines.push('  <part-list>')
  lines.push('    <score-part id="P1">')
  lines.push('      <part-name>Shinobue</part-name>')
  lines.push('    </score-part>')
  lines.push('  </part-list>')

  // Part
  lines.push('  <part id="P1">')

  for (const measure of score.measures) {
    lines.push(`    <measure number="${measure.number}">`)

    // Attributes (最初の小節のみ)
    if (measure.number === 1) {
      lines.push('      <attributes>')
      lines.push(`        <divisions>${divisions}</divisions>`)
      lines.push('        <key><fifths>0</fifths></key>')
      lines.push('        <time>')
      lines.push(`          <beats>${beats}</beats>`)
      lines.push(`          <beat-type>${beatType}</beat-type>`)
      lines.push('        </time>')
      lines.push('        <clef>')
      lines.push('          <sign>G</sign>')
      lines.push('          <line>2</line>')
      lines.push('        </clef>')
      lines.push('      </attributes>')

      // Direction: tempo
      lines.push('      <direction placement="above">')
      lines.push(`        <sound tempo="${score.metadata.tempo}"/>`)
      lines.push('      </direction>')
    }

    // Notes
    for (const note of measure.notes) {
      lines.push(...noteToMusicXML(note, divisions).map((l) => `      ${l}`))
    }

    // Barline
    if (measure.barline && measure.barline !== 'normal') {
      lines.push(...barlineToMusicXML(measure.barline).map((l) => `      ${l}`))
    }

    lines.push('    </measure>')
  }

  lines.push('  </part>')
  lines.push('</score-partwise>')

  return lines.join('\n')
}

function noteToMusicXML(note: NoteEvent, divisions: number): string[] {
  const lines: string[] = []
  const durationValue = Math.round(durationToBeats(note.duration) * divisions)
  const xmlType = durationTypeToMusicXML(note.duration.type)

  lines.push('<note>')

  if (note.type === 'rest') {
    lines.push('  <rest/>')
  } else if (note.pitch) {
    const { step, alter, octave } = westernToPitchParts(note.pitch.western)
    lines.push('  <pitch>')
    lines.push(`    <step>${step}</step>`)
    if (alter !== 0) {
      lines.push(`    <alter>${alter}</alter>`)
    }
    lines.push(`    <octave>${octave}</octave>`)
    lines.push('  </pitch>')
  }

  lines.push(`  <duration>${durationValue}</duration>`)
  lines.push(`  <type>${xmlType}</type>`)

  for (let i = 0; i < note.duration.dots; i++) {
    lines.push('  <dot/>')
  }

  // Tie
  if (note.tie === 'start' || note.tie === 'continue') {
    lines.push('  <tie type="start"/>')
  }
  if (note.tie === 'stop' || note.tie === 'continue') {
    lines.push('  <tie type="stop"/>')
  }

  lines.push('</note>')
  return lines
}

function barlineToMusicXML(barline: string): string[] {
  const lines: string[] = []
  switch (barline) {
    case 'double':
      lines.push('<barline location="right">')
      lines.push('  <bar-style>light-light</bar-style>')
      lines.push('</barline>')
      break
    case 'final':
      lines.push('<barline location="right">')
      lines.push('  <bar-style>light-heavy</bar-style>')
      lines.push('</barline>')
      break
    case 'repeat-start':
      lines.push('<barline location="left">')
      lines.push('  <bar-style>heavy-light</bar-style>')
      lines.push('  <repeat direction="forward"/>')
      lines.push('</barline>')
      break
    case 'repeat-end':
      lines.push('<barline location="right">')
      lines.push('  <bar-style>light-heavy</bar-style>')
      lines.push('  <repeat direction="backward"/>')
      lines.push('</barline>')
      break
  }
  return lines
}

function durationTypeToMusicXML(type: string): string {
  const mapping: Record<string, string> = {
    whole: 'whole',
    half: 'half',
    quarter: 'quarter',
    eighth: 'eighth',
    sixteenth: '16th',
    'thirty-second': '32nd',
  }
  return mapping[type] ?? 'quarter'
}

/** 西洋音名 (例: "C#5", "Bb4") を MusicXML の step/alter/octave に分解 */
function westernToPitchParts(western: string): { step: string; alter: number; octave: number } {
  const match = western.match(/^([A-G])(#|b)?(\d+)$/)
  if (!match) {
    return { step: 'C', alter: 0, octave: 4 }
  }
  const step = match[1]!
  const accidental = match[2] ?? ''
  const octave = parseInt(match[3]!, 10)
  const alter = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0

  return { step, alter, octave }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ── 独自 JSON エクスポート ──

/**
 * Score を独自 JSON (.shinobue.json) 文字列に変換
 */
export function exportToShinobueJSON(score: Score): string {
  return JSON.stringify(score, null, 2)
}

// ── ダウンロードヘルパー ──

/**
 * テキストデータをファイルとしてダウンロード
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * MusicXML としてダウンロード
 */
export function downloadMusicXML(score: Score, filename?: string): void {
  const xml = exportToMusicXML(score)
  downloadFile(xml, filename ?? `${score.metadata.title}.musicxml`, 'application/xml')
}

/**
 * 独自JSON としてダウンロード
 */
export function downloadShinobueJSON(score: Score, filename?: string): void {
  const json = exportToShinobueJSON(score)
  downloadFile(json, filename ?? `${score.metadata.title}.shinobue.json`, 'application/json')
}
