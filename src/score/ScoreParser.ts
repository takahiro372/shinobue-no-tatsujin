import type { Score, Measure, NoteEvent, NotePitch } from './ScoreModel'
import type { DurationType } from '../types/music'
import { generateNoteId } from './ScoreModel'
import { getFingeringChart } from '../shinobue/FingeringChart'
import { midiNoteToFrequency } from '../utils/frequency'
import type { ShinobueNote } from '../types/shinobue'

// ── MusicXML パーサー ──

/**
 * MusicXML 文字列をパースして内部 Score モデルに変換する
 */
export function parseMusicXML(xmlString: string, shinobueKey = 'nana'): Score {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'application/xml')

  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error(`MusicXML パースエラー: ${parseError.textContent}`)
  }

  const scorePartwise = doc.querySelector('score-partwise')
  if (!scorePartwise) {
    throw new Error('score-partwise 要素が見つかりません')
  }

  // メタデータ
  const title = getText(doc, 'work-title') || getText(doc, 'movement-title') || '無題'
  const composer = getCreator(doc, 'composer') || ''
  const arranger = getCreator(doc, 'arranger') || undefined

  // パート (最初のパートのみ対応)
  const partElements = doc.querySelectorAll('part')
  if (partElements.length === 0) {
    throw new Error('part 要素が見つかりません')
  }
  const part = partElements[0]!

  // 小節をパース
  const measureElements = part.querySelectorAll('measure')
  let currentDivisions = 1
  let currentTimeSignature: [number, number] = [4, 4]
  let currentTempo = 120

  const measures: Measure[] = []

  measureElements.forEach((measureEl, index) => {
    // attributes 要素からdivisions, time, tempo を取得
    const attributes = measureEl.querySelector('attributes')
    if (attributes) {
      const div = attributes.querySelector('divisions')
      if (div?.textContent) {
        currentDivisions = parseInt(div.textContent, 10)
      }

      const time = attributes.querySelector('time')
      if (time) {
        const beats = time.querySelector('beats')?.textContent
        const beatType = time.querySelector('beat-type')?.textContent
        if (beats && beatType) {
          currentTimeSignature = [parseInt(beats, 10), parseInt(beatType, 10)]
        }
      }
    }

    // direction 要素からテンポを取得
    const directions = measureEl.querySelectorAll('direction')
    for (const dir of directions) {
      const sound = dir.querySelector('sound')
      if (sound?.getAttribute('tempo')) {
        currentTempo = parseFloat(sound.getAttribute('tempo')!)
      }
    }

    // 音符をパース
    const notes = parseMeasureNotes(measureEl, currentDivisions, shinobueKey)

    // barline
    const barlineEl = measureEl.querySelector('barline')
    let barline: Measure['barline'] = 'normal'
    if (barlineEl) {
      barline = parseBarline(barlineEl)
    }
    if (index === measureElements.length - 1 && barline === 'normal') {
      barline = 'final'
    }

    measures.push({
      number: index + 1,
      notes,
      barline,
    })
  })

  return {
    metadata: {
      title,
      composer,
      arranger,
      shinobueKey,
      tempo: currentTempo,
      timeSignature: currentTimeSignature,
    },
    measures,
  }
}

/** MusicXML の小節内の音符をパース */
function parseMeasureNotes(
  measureEl: Element,
  divisions: number,
  shinobueKey: string,
): NoteEvent[] {
  const notes: NoteEvent[] = []
  let currentBeat = 0
  const chart = getFingeringChart(shinobueKey)

  const children = measureEl.children
  for (let i = 0; i < children.length; i++) {
    const el = children[i]!
    if (el.tagName === 'forward') {
      const dur = el.querySelector('duration')
      if (dur?.textContent) {
        currentBeat += parseInt(dur.textContent, 10) / divisions
      }
      continue
    }
    if (el.tagName === 'backup') {
      const dur = el.querySelector('duration')
      if (dur?.textContent) {
        currentBeat -= parseInt(dur.textContent, 10) / divisions
      }
      continue
    }
    if (el.tagName !== 'note') continue

    const isChord = el.querySelector('chord') !== null
    const isRest = el.querySelector('rest') !== null

    // duration (MusicXML divisions単位)
    const durationEl = el.querySelector('duration')
    const xmlDuration = durationEl?.textContent ? parseInt(durationEl.textContent, 10) : divisions
    const durationInBeats = xmlDuration / divisions

    // type (音価)
    const typeEl = el.querySelector('type')
    const durationType = typeEl?.textContent
      ? mapMusicXMLDurationType(typeEl.textContent)
      : guessDurationType(durationInBeats)

    // 付点
    const dotElements = el.querySelectorAll('dot')
    const dots = dotElements.length

    // chord の場合は同じ位置
    const startBeat = isChord ? currentBeat : currentBeat

    const noteEvent: NoteEvent = {
      id: generateNoteId(),
      type: isRest ? 'rest' : 'note',
      duration: { type: durationType, dots },
      startBeat,
    }

    // ピッチ
    if (!isRest) {
      const pitchEl = el.querySelector('pitch')
      if (pitchEl) {
        const pitch = parsePitch(pitchEl, chart)
        if (pitch) {
          noteEvent.pitch = pitch
        }
      }
    }

    // tie
    const tieElements = el.querySelectorAll('tie')
    if (tieElements.length > 0) {
      const types = Array.from(tieElements).map((t) => t.getAttribute('type'))
      if (types.includes('start') && types.includes('stop')) {
        noteEvent.tie = 'continue'
      } else if (types.includes('start')) {
        noteEvent.tie = 'start'
      } else if (types.includes('stop')) {
        noteEvent.tie = 'stop'
      }
    }

    // dynamics
    const dynamicsEl = el.querySelector('dynamics')
    if (dynamicsEl && dynamicsEl.firstElementChild) {
      noteEvent.dynamics = dynamicsEl.firstElementChild.tagName
    }

    notes.push(noteEvent)

    if (!isChord) {
      currentBeat += durationInBeats
    }
  }

  return notes
}

/** MusicXML の pitch 要素をパース */
function parsePitch(pitchEl: Element, chart: ShinobueNote[]): NotePitch | null {
  const step = pitchEl.querySelector('step')?.textContent
  const octave = pitchEl.querySelector('octave')?.textContent
  const alter = pitchEl.querySelector('alter')?.textContent

  if (!step || !octave) return null

  const alterValue = alter ? parseInt(alter, 10) : 0

  // MIDI ノート番号を計算
  const stepToSemitone: Record<string, number> = {
    C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
  }
  const semitone = stepToSemitone[step]
  if (semitone === undefined) return null

  const midiNote = (parseInt(octave, 10) + 1) * 12 + semitone + alterValue
  const frequency = midiNoteToFrequency(midiNote)

  // 西洋音名を構築
  const accidental = alterValue === 1 ? '#' : alterValue === -1 ? 'b' : ''
  const western = `${step}${accidental}${octave}`

  // 篠笛の音にマッピング
  const matched = findClosestShinobueNote(frequency, chart)

  return {
    shinobueNumber: matched?.number ?? 0,
    register: matched?.register ?? 'ro',
    frequency,
    midiNote,
    western,
  }
}

/** 周波数から最も近い篠笛の音を見つける */
function findClosestShinobueNote(frequency: number, chart: ShinobueNote[]): ShinobueNote | null {
  let best: ShinobueNote | null = null
  let bestDiff = Infinity

  for (const note of chart) {
    const diff = Math.abs(1200 * Math.log2(frequency / note.frequency))
    if (diff < bestDiff) {
      bestDiff = diff
      best = note
    }
  }

  return best
}

/** MusicXML barline 要素をパース */
function parseBarline(barlineEl: Element): Measure['barline'] {
  const barStyle = barlineEl.querySelector('bar-style')?.textContent
  const repeat = barlineEl.querySelector('repeat')
  const direction = repeat?.getAttribute('direction')

  if (direction === 'forward') return 'repeat-start'
  if (direction === 'backward') return 'repeat-end'
  if (barStyle === 'light-heavy') return 'final'
  if (barStyle === 'light-light') return 'double'

  return 'normal'
}

/** MusicXML の音価タイプ名を内部型に変換 */
function mapMusicXMLDurationType(xmlType: string): DurationType {
  const mapping: Record<string, DurationType> = {
    whole: 'whole',
    half: 'half',
    quarter: 'quarter',
    eighth: 'eighth',
    '16th': 'sixteenth',
    '32nd': 'thirty-second',
  }
  return mapping[xmlType] ?? 'quarter'
}

/** 拍数から音価タイプを推定 */
function guessDurationType(beats: number): DurationType {
  if (beats >= 4) return 'whole'
  if (beats >= 2) return 'half'
  if (beats >= 1) return 'quarter'
  if (beats >= 0.5) return 'eighth'
  if (beats >= 0.25) return 'sixteenth'
  return 'thirty-second'
}

// ── 独自 JSON パーサー ──

/** 独自 JSON (.shinobue.json) をパース */
export function parseShinobueJSON(json: string): Score {
  const data = JSON.parse(json) as Score
  if (!data.metadata || !data.measures) {
    throw new Error('不正な shinobue.json 形式です')
  }
  return data
}

// ── ヘルパー ──

function getText(doc: Document, selector: string): string | null {
  const el = doc.querySelector(selector)
  return el?.textContent?.trim() ?? null
}

function getCreator(doc: Document, type: string): string | null {
  const creators = doc.querySelectorAll('creator')
  for (const creator of creators) {
    if (creator.getAttribute('type') === type) {
      return creator.textContent?.trim() ?? null
    }
  }
  return null
}
