import { describe, it, expect, beforeEach } from 'vitest'
import { parseMusicXML, parseShinobueJSON } from './ScoreParser'
import { resetNoteIdCounter } from './ScoreModel'

beforeEach(() => {
  resetNoteIdCounter()
})

const SIMPLE_MUSICXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>テスト楽曲</work-title>
  </work>
  <identification>
    <creator type="composer">テスト作曲者</creator>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Shinobue</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
      </attributes>
      <direction placement="above">
        <sound tempo="80"/>
      </direction>
      <note>
        <pitch>
          <step>B</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>C</step>
          <alter>1</alter>
          <octave>5</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>D</step>
          <octave>5</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>E</step>
          <octave>5</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
    </measure>
    <measure number="2">
      <note>
        <rest/>
        <duration>2</duration>
        <type>half</type>
      </note>
      <note>
        <pitch>
          <step>F</step>
          <alter>1</alter>
          <octave>5</octave>
        </pitch>
        <duration>2</duration>
        <type>half</type>
      </note>
      <barline location="right">
        <bar-style>light-heavy</bar-style>
      </barline>
    </measure>
  </part>
</score-partwise>`

describe('parseMusicXML', () => {
  it('メタデータを正しくパースする', () => {
    const score = parseMusicXML(SIMPLE_MUSICXML)
    expect(score.metadata.title).toBe('テスト楽曲')
    expect(score.metadata.composer).toBe('テスト作曲者')
    expect(score.metadata.tempo).toBe(80)
    expect(score.metadata.timeSignature).toEqual([4, 4])
    expect(score.metadata.shinobueKey).toBe('nana')
  })

  it('小節を正しくパースする', () => {
    const score = parseMusicXML(SIMPLE_MUSICXML)
    expect(score.measures).toHaveLength(2)
    expect(score.measures[0]!.number).toBe(1)
    expect(score.measures[1]!.number).toBe(2)
  })

  it('第1小節の音符を正しくパースする', () => {
    const score = parseMusicXML(SIMPLE_MUSICXML)
    const m1 = score.measures[0]!
    expect(m1.notes).toHaveLength(4)

    // 全て四分音符
    for (const note of m1.notes) {
      expect(note.duration.type).toBe('quarter')
      expect(note.type).toBe('note')
    }

    // startBeat が 0, 1, 2, 3
    expect(m1.notes.map((n) => n.startBeat)).toEqual([0, 1, 2, 3])
  })

  it('ピッチを正しくパースする (B4 → 最も近い一)', () => {
    const score = parseMusicXML(SIMPLE_MUSICXML)
    const firstNote = score.measures[0]!.notes[0]!
    expect(firstNote.pitch).toBeDefined()
    expect(firstNote.pitch!.western).toBe('B4')
    expect(firstNote.pitch!.shinobueNumber).toBe(1) // 一（最も近い音）
    expect(firstNote.pitch!.register).toBe('ro')
  })

  it('シャープ付きピッチをパースする (C#5)', () => {
    const score = parseMusicXML(SIMPLE_MUSICXML)
    const secondNote = score.measures[0]!.notes[1]!
    expect(secondNote.pitch!.western).toBe('C#5')
    expect(secondNote.pitch!.shinobueNumber).toBe(1) // 一
  })

  it('休符をパースする', () => {
    const score = parseMusicXML(SIMPLE_MUSICXML)
    const m2 = score.measures[1]!
    expect(m2.notes[0]!.type).toBe('rest')
    expect(m2.notes[0]!.duration.type).toBe('half')
    expect(m2.notes[0]!.pitch).toBeUndefined()
  })

  it('最終小節の barline を final としてパースする', () => {
    const score = parseMusicXML(SIMPLE_MUSICXML)
    expect(score.measures[1]!.barline).toBe('final')
  })

  it('不正なXMLでエラーを投げる', () => {
    expect(() => parseMusicXML('<invalid>')).toThrow()
  })

  it('六本調子を指定してパースできる', () => {
    const score = parseMusicXML(SIMPLE_MUSICXML, 'roku')
    expect(score.metadata.shinobueKey).toBe('roku')
  })
})

const DOTTED_MUSICXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>P</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
      </attributes>
      <note>
        <pitch><step>D</step><octave>5</octave></pitch>
        <duration>3</duration>
        <type>quarter</type>
        <dot/>
      </note>
      <note>
        <pitch><step>E</step><octave>5</octave></pitch>
        <duration>1</duration>
        <type>eighth</type>
      </note>
      <note>
        <rest/>
        <duration>4</duration>
        <type>half</type>
      </note>
    </measure>
  </part>
</score-partwise>`

describe('parseMusicXML - 付点音符', () => {
  it('付点四分音符をパースする', () => {
    const score = parseMusicXML(DOTTED_MUSICXML)
    const note = score.measures[0]!.notes[0]!
    expect(note.duration.type).toBe('quarter')
    expect(note.duration.dots).toBe(1)
  })

  it('付点後の八分音符の startBeat が正しい', () => {
    const score = parseMusicXML(DOTTED_MUSICXML)
    const notes = score.measures[0]!.notes
    // divisions=2なので: 付点四分=3/2=1.5拍, 八分=1/2=0.5拍
    expect(notes[0]!.startBeat).toBe(0)
    expect(notes[1]!.startBeat).toBeCloseTo(1.5, 5)
    expect(notes[2]!.startBeat).toBeCloseTo(2, 5)
  })
})

const TIE_MUSICXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>P</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <note>
        <pitch><step>D</step><octave>5</octave></pitch>
        <duration>2</duration>
        <type>half</type>
        <tie type="start"/>
      </note>
      <note>
        <pitch><step>D</step><octave>5</octave></pitch>
        <duration>2</duration>
        <type>half</type>
        <tie type="stop"/>
      </note>
    </measure>
  </part>
</score-partwise>`

describe('parseMusicXML - タイ', () => {
  it('タイの開始と終了をパースする', () => {
    const score = parseMusicXML(TIE_MUSICXML)
    const notes = score.measures[0]!.notes
    expect(notes[0]!.tie).toBe('start')
    expect(notes[1]!.tie).toBe('stop')
  })
})

const REPEAT_MUSICXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>P</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <barline location="left">
        <bar-style>heavy-light</bar-style>
        <repeat direction="forward"/>
      </barline>
      <note><rest/><duration>4</duration><type>whole</type></note>
    </measure>
    <measure number="2">
      <note><rest/><duration>4</duration><type>whole</type></note>
      <barline location="right">
        <bar-style>light-heavy</bar-style>
        <repeat direction="backward"/>
      </barline>
    </measure>
  </part>
</score-partwise>`

describe('parseMusicXML - 繰り返し記号', () => {
  it('repeat-start をパースする', () => {
    const score = parseMusicXML(REPEAT_MUSICXML)
    expect(score.measures[0]!.barline).toBe('repeat-start')
  })

  it('repeat-end をパースする', () => {
    const score = parseMusicXML(REPEAT_MUSICXML)
    expect(score.measures[1]!.barline).toBe('repeat-end')
  })
})

describe('parseShinobueJSON', () => {
  it('有効な JSON をパースする', () => {
    const json = JSON.stringify({
      metadata: {
        title: 'テスト',
        composer: '',
        shinobueKey: 'nana',
        tempo: 80,
        timeSignature: [4, 4],
      },
      measures: [
        {
          number: 1,
          notes: [{ id: '1', type: 'rest', duration: { type: 'whole', dots: 0 }, startBeat: 0 }],
        },
      ],
    })
    const score = parseShinobueJSON(json)
    expect(score.metadata.title).toBe('テスト')
    expect(score.measures).toHaveLength(1)
  })

  it('不正な JSON でエラーを投げる', () => {
    expect(() => parseShinobueJSON('{}')).toThrow()
    expect(() => parseShinobueJSON('invalid')).toThrow()
  })
})
