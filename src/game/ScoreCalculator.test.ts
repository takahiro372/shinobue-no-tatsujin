import { describe, it, expect, beforeEach } from 'vitest'
import { ComboManager } from './ComboManager'
import { ScoreCalculator, getBaseScore } from './ScoreCalculator'
import type { JudgementResult } from '../types/game'

// ── ComboManager ──

describe('ComboManager', () => {
  let combo: ComboManager

  beforeEach(() => {
    combo = new ComboManager()
  })

  it('初期値は 0', () => {
    expect(combo.combo).toBe(0)
    expect(combo.maxCombo).toBe(0)
    expect(combo.multiplier).toBe(1.0)
  })

  it('perfect/great/good でコンボが増加する', () => {
    combo.register('perfect')
    expect(combo.combo).toBe(1)
    combo.register('great')
    expect(combo.combo).toBe(2)
    combo.register('good')
    expect(combo.combo).toBe(3)
  })

  it('miss でコンボがリセットされる', () => {
    combo.register('perfect')
    combo.register('perfect')
    combo.register('perfect')
    expect(combo.combo).toBe(3)
    combo.register('miss')
    expect(combo.combo).toBe(0)
  })

  it('maxCombo が正しく追跡される', () => {
    for (let i = 0; i < 5; i++) combo.register('perfect')
    expect(combo.maxCombo).toBe(5)
    combo.register('miss')
    expect(combo.maxCombo).toBe(5)
    for (let i = 0; i < 3; i++) combo.register('perfect')
    expect(combo.maxCombo).toBe(5) // 3 < 5
    for (let i = 0; i < 5; i++) combo.register('perfect')
    expect(combo.maxCombo).toBe(8) // 3+5=8 > 5
  })

  it('倍率: 10コンボごとに +0.1', () => {
    expect(combo.multiplier).toBe(1.0)
    for (let i = 0; i < 10; i++) combo.register('perfect')
    expect(combo.multiplier).toBeCloseTo(1.1)
    for (let i = 0; i < 10; i++) combo.register('perfect')
    expect(combo.multiplier).toBeCloseTo(1.2)
  })

  it('倍率は最大 2.0', () => {
    for (let i = 0; i < 200; i++) combo.register('perfect')
    expect(combo.multiplier).toBe(2.0)
  })

  it('reset で全てクリア', () => {
    for (let i = 0; i < 10; i++) combo.register('perfect')
    combo.reset()
    expect(combo.combo).toBe(0)
    expect(combo.maxCombo).toBe(0)
    expect(combo.multiplier).toBe(1.0)
  })
})

// ── ScoreCalculator ──

function makeJudgement(type: JudgementResult['type'], noteId = 'n'): JudgementResult {
  return { type, timingDelta: 0, pitchDelta: 0, noteId }
}

describe('ScoreCalculator', () => {
  let calc: ScoreCalculator

  beforeEach(() => {
    calc = new ScoreCalculator()
  })

  it('初期スコアは 0', () => {
    expect(calc.score).toBe(0)
  })

  it('Perfect で 1000 × 倍率 を加算', () => {
    const gained = calc.add(makeJudgement('perfect'), 1.0)
    expect(gained).toBe(1000)
    expect(calc.score).toBe(1000)
  })

  it('Great で 800 × 倍率 を加算', () => {
    const gained = calc.add(makeJudgement('great'), 1.0)
    expect(gained).toBe(800)
  })

  it('Good で 500 × 倍率 を加算', () => {
    const gained = calc.add(makeJudgement('good'), 1.0)
    expect(gained).toBe(500)
  })

  it('Miss で 0 を加算', () => {
    const gained = calc.add(makeJudgement('miss'), 1.0)
    expect(gained).toBe(0)
  })

  it('倍率が適用される', () => {
    const gained = calc.add(makeJudgement('perfect'), 1.5)
    expect(gained).toBe(1500)
  })

  it('getCounts が正しいカウントを返す', () => {
    calc.add(makeJudgement('perfect'), 1)
    calc.add(makeJudgement('perfect'), 1)
    calc.add(makeJudgement('great'), 1)
    calc.add(makeJudgement('miss'), 1)
    const counts = calc.getCounts()
    expect(counts.perfect).toBe(2)
    expect(counts.great).toBe(1)
    expect(counts.good).toBe(0)
    expect(counts.miss).toBe(1)
  })

  it('getResult でランクが正しく算出される', () => {
    // 10ノート中10ヒット → accuracy 100% → S
    for (let i = 0; i < 10; i++) {
      calc.add(makeJudgement('perfect'), 1)
    }
    const result = calc.getResult(10, 10)
    expect(result.accuracy).toBe(100)
    expect(result.rank).toBe('S')
    expect(result.perfectCount).toBe(10)
    expect(result.totalNotes).toBe(10)
  })

  it('accuracy 85%以上 → A ランク', () => {
    for (let i = 0; i < 9; i++) calc.add(makeJudgement('great'), 1)
    calc.add(makeJudgement('miss'), 1)
    const result = calc.getResult(9, 10)
    expect(result.accuracy).toBe(90)
    expect(result.rank).toBe('A')
  })

  it('accuracy 50%未満 → D ランク', () => {
    for (let i = 0; i < 2; i++) calc.add(makeJudgement('good'), 1)
    for (let i = 0; i < 8; i++) calc.add(makeJudgement('miss'), 1)
    const result = calc.getResult(2, 10)
    expect(result.accuracy).toBe(20)
    expect(result.rank).toBe('D')
  })

  it('reset でクリア', () => {
    calc.add(makeJudgement('perfect'), 1)
    calc.reset()
    expect(calc.score).toBe(0)
    expect(calc.getCounts().perfect).toBe(0)
  })
})

describe('getBaseScore', () => {
  it('perfect → 1000', () => expect(getBaseScore('perfect')).toBe(1000))
  it('great → 800', () => expect(getBaseScore('great')).toBe(800))
  it('good → 500', () => expect(getBaseScore('good')).toBe(500))
  it('miss → 0', () => expect(getBaseScore('miss')).toBe(0))
})
