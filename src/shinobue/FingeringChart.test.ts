import { describe, it, expect } from 'vitest'
import {
  FINGERING_CHART_NANA,
  FINGERING_CHART_ROKU,
  FINGERING_CHART_HACHI,
  getFingeringChart,
} from './FingeringChart'

describe('FINGERING_CHART_NANA（七本調子）', () => {
  it('呂音は8音（筒音〜七）ある', () => {
    const ro = FINGERING_CHART_NANA.filter((n) => n.register === 'ro')
    expect(ro).toHaveLength(8)
  })

  it('甲音は7音（1〜7）ある', () => {
    const kan = FINGERING_CHART_NANA.filter((n) => n.register === 'kan')
    expect(kan).toHaveLength(7)
  })

  it('大甲は4音（大1〜大4）ある', () => {
    const daikan = FINGERING_CHART_NANA.filter((n) => n.register === 'daikan')
    expect(daikan).toHaveLength(4)
  })

  it('筒音は全穴閉で B4', () => {
    const tsutsuNe = FINGERING_CHART_NANA[0]!
    expect(tsutsuNe.number).toBe(0)
    expect(tsutsuNe.western).toBe('B4')
    expect(tsutsuNe.fingering).toEqual([true, true, true, true, true, true, true])
  })

  it('七（呂）は全穴開で B5', () => {
    const nana = FINGERING_CHART_NANA.find((n) => n.register === 'ro' && n.number === 7)!
    expect(nana.western).toBe('B5')
    expect(nana.fingering).toEqual([false, false, false, false, false, false, false])
  })

  it('全ての運指は7要素の配列', () => {
    for (const note of FINGERING_CHART_NANA) {
      expect(note.fingering).toHaveLength(7)
    }
  })

  it('周波数は昇順', () => {
    for (let i = 1; i < FINGERING_CHART_NANA.length; i++) {
      expect(FINGERING_CHART_NANA[i]!.frequency).toBeGreaterThan(
        FINGERING_CHART_NANA[i - 1]!.frequency,
      )
    }
  })
})

describe('FINGERING_CHART_ROKU（六本調子）', () => {
  it('筒音は A4', () => {
    const tsutsuNe = FINGERING_CHART_ROKU[0]!
    expect(tsutsuNe.western).toBe('A4')
    expect(tsutsuNe.frequency).toBe(440)
  })

  it('合計19音ある', () => {
    expect(FINGERING_CHART_ROKU).toHaveLength(19)
  })
})

describe('FINGERING_CHART_HACHI（八本調子）', () => {
  it('筒音は C5', () => {
    const tsutsuNe = FINGERING_CHART_HACHI[0]!
    expect(tsutsuNe.western).toBe('C5')
  })
})

describe('getFingeringChart', () => {
  it('nana で七本調子の運指表を返す', () => {
    expect(getFingeringChart('nana')).toBe(FINGERING_CHART_NANA)
  })

  it('roku で六本調子の運指表を返す', () => {
    expect(getFingeringChart('roku')).toBe(FINGERING_CHART_ROKU)
  })

  it('hachi で八本調子の運指表を返す', () => {
    expect(getFingeringChart('hachi')).toBe(FINGERING_CHART_HACHI)
  })

  it('不明なキーではデフォルト（七本調子）を返す', () => {
    expect(getFingeringChart('unknown')).toBe(FINGERING_CHART_NANA)
  })
})
