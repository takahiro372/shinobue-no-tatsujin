import { describe, it, expect } from 'vitest'
import {
  FINGERING_CHART_NANA,
  FINGERING_CHART_ROKU,
  FINGERING_CHART_HACHI,
  getFingeringChart,
} from './FingeringChart'

describe('FINGERING_CHART_NANA（七本調子）', () => {
  it('呂音は7音（一〜七）ある', () => {
    const ro = FINGERING_CHART_NANA.filter((n) => n.register === 'ro')
    expect(ro).toHaveLength(7)
  })

  it('甲音は7音（1〜7）ある', () => {
    const kan = FINGERING_CHART_NANA.filter((n) => n.register === 'kan')
    expect(kan).toHaveLength(7)
  })

  it('大甲は4音（大1〜大4）ある', () => {
    const daikan = FINGERING_CHART_NANA.filter((n) => n.register === 'daikan')
    expect(daikan).toHaveLength(4)
  })

  it('一（呂）は7穴のみ開で C#5', () => {
    const ichi = FINGERING_CHART_NANA[0]!
    expect(ichi.number).toBe(1)
    expect(ichi.western).toBe('C#5')
    expect(ichi.fingering).toEqual([true, true, true, true, true, true, false])
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
  it('一（呂）は B4', () => {
    const ichi = FINGERING_CHART_ROKU[0]!
    expect(ichi.western).toBe('B4')
    expect(ichi.frequency).toBe(493.88)
  })

  it('合計18音ある', () => {
    expect(FINGERING_CHART_ROKU).toHaveLength(18)
  })
})

describe('FINGERING_CHART_HACHI（八本調子）', () => {
  it('一（呂）は D5 (587.33Hz)', () => {
    const ichi = FINGERING_CHART_HACHI[0]!
    expect(ichi.western).toBe('D5')
    expect(ichi.frequency).toBe(587.33)
  })

  it('呂音の音階が D-E-F-G-A-B-C', () => {
    const ro = FINGERING_CHART_HACHI.filter((n) => n.register === 'ro')
    const westerns = ro.map((n) => n.western)
    expect(westerns).toEqual(['D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'])
  })

  it('呂音の周波数が正しい', () => {
    const ro = FINGERING_CHART_HACHI.filter((n) => n.register === 'ro')
    const freqs = ro.map((n) => n.frequency)
    expect(freqs).toEqual([587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.50])
  })

  it('合計18音ある', () => {
    expect(FINGERING_CHART_HACHI).toHaveLength(18)
  })

  it('周波数は昇順', () => {
    for (let i = 1; i < FINGERING_CHART_HACHI.length; i++) {
      expect(FINGERING_CHART_HACHI[i]!.frequency).toBeGreaterThan(
        FINGERING_CHART_HACHI[i - 1]!.frequency,
      )
    }
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
