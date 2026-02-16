import { describe, it, expect } from 'vitest'
import { TimingJudge } from './TimingJudge'

describe('TimingJudge', () => {
  const judge = new TimingJudge()

  describe('judge', () => {
    it('タイミング±30ms 音程±10cents → Perfect', () => {
      const r = judge.judge(20, 5, 'n1')
      expect(r.type).toBe('perfect')
      expect(r.noteId).toBe('n1')
    })

    it('タイミング0ms 音程0cents → Perfect', () => {
      expect(judge.judge(0, 0, 'n1').type).toBe('perfect')
    })

    it('ちょうど±30ms ±10cents → Perfect (境界)', () => {
      expect(judge.judge(30, 10, 'n1').type).toBe('perfect')
      expect(judge.judge(-30, -10, 'n1').type).toBe('perfect')
    })

    it('タイミング±60ms 音程±25cents → Great', () => {
      expect(judge.judge(50, 20, 'n1').type).toBe('great')
      expect(judge.judge(-45, -15, 'n1').type).toBe('great')
    })

    it('タイミングOKでも音程がGreat範囲 → Great', () => {
      expect(judge.judge(10, 20, 'n1').type).toBe('great')
    })

    it('音程OKでもタイミングがGreat範囲 → Great', () => {
      expect(judge.judge(50, 5, 'n1').type).toBe('great')
    })

    it('タイミング±100ms 音程±40cents → Good', () => {
      expect(judge.judge(80, 35, 'n1').type).toBe('good')
    })

    it('タイミング100ms超 → Miss', () => {
      expect(judge.judge(150, 5, 'n1').type).toBe('miss')
    })

    it('音程40cents超 → Miss', () => {
      expect(judge.judge(10, 45, 'n1').type).toBe('miss')
    })

    it('タイミング・音程ともに超過 → Miss', () => {
      expect(judge.judge(200, 60, 'n1').type).toBe('miss')
    })

    it('timingDelta と pitchDelta が結果に含まれる', () => {
      const r = judge.judge(-25, 8, 'n1')
      expect(r.timingDelta).toBe(-25)
      expect(r.pitchDelta).toBe(8)
    })
  })

  describe('isInJudgementWindow', () => {
    it('±100ms以内はtrue', () => {
      expect(judge.isInJudgementWindow(50)).toBe(true)
      expect(judge.isInJudgementWindow(-100)).toBe(true)
    })

    it('100ms超はfalse', () => {
      expect(judge.isInJudgementWindow(101)).toBe(false)
      expect(judge.isInJudgementWindow(-150)).toBe(false)
    })
  })

  describe('isPastJudgementWindow', () => {
    it('通過後はtrue', () => {
      expect(judge.isPastJudgementWindow(101)).toBe(true)
      expect(judge.isPastJudgementWindow(200)).toBe(true)
    })

    it('まだ通過前はfalse', () => {
      expect(judge.isPastJudgementWindow(50)).toBe(false)
      expect(judge.isPastJudgementWindow(-200)).toBe(false)
    })
  })
})

describe('TimingJudge with difficulty', () => {
  it('初心者 (scale 1.5) で判定が緩くなる', () => {
    const judge = new TimingJudge({ judgementScale: 1.5, scrollSpeed: 1, showFingering: 'always', showPitchMeter: true })
    // Perfect: ±45ms, ±15cents
    expect(judge.judge(40, 12, 'n1').type).toBe('perfect')
    // 通常なら Miss (timing 140ms) が Good になる
    expect(judge.judge(140, 50, 'n1').type).toBe('good')
  })

  it('達人 (scale 0.6) で判定が厳しくなる', () => {
    const judge = new TimingJudge({ judgementScale: 0.6, scrollSpeed: 1, showFingering: 'none', showPitchMeter: false })
    // Perfect: ±18ms, ±6cents
    expect(judge.judge(20, 5, 'n1').type).toBe('great') // 通常ならPerfectだが達人ではGreat
    expect(judge.judge(10, 4, 'n1').type).toBe('perfect')
  })
})
