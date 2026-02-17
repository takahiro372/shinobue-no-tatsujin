import type { ShinobueNote } from '../types/shinobue'

/**
 * 七本調子の運指表
 * true = 穴を塞ぐ, false = 穴を開ける
 * 指穴は [1穴, 2穴, 3穴, 4穴, 5穴, 6穴, 7穴]
 */
export const FINGERING_CHART_NANA: ShinobueNote[] = [
  // 呂音
  { number: 1, register: 'ro', fingering: [true, true, true, true, true, true, false], western: 'C#5', frequency: 554.37, name: '一' },
  { number: 2, register: 'ro', fingering: [true, true, true, true, true, false, false], western: 'D5', frequency: 587.33, name: '二' },
  { number: 3, register: 'ro', fingering: [true, true, true, true, false, false, false], western: 'E5', frequency: 659.25, name: '三' },
  { number: 4, register: 'ro', fingering: [true, true, true, false, false, false, false], western: 'F#5', frequency: 739.99, name: '四' },
  { number: 5, register: 'ro', fingering: [true, true, false, false, false, false, false], western: 'G5', frequency: 783.99, name: '五' },
  { number: 6, register: 'ro', fingering: [true, false, false, false, false, false, false], western: 'A5', frequency: 880.0, name: '六' },
  { number: 7, register: 'ro', fingering: [false, false, false, false, false, false, false], western: 'B5', frequency: 987.77, name: '七' },
  // 甲音 (同じ運指、息を強く)
  { number: 1, register: 'kan', fingering: [true, true, true, true, true, true, false], western: 'C#6', frequency: 1108.73, name: '1' },
  { number: 2, register: 'kan', fingering: [true, true, true, true, true, false, false], western: 'D6', frequency: 1174.66, name: '2' },
  { number: 3, register: 'kan', fingering: [true, true, true, true, false, false, false], western: 'E6', frequency: 1318.51, name: '3' },
  { number: 4, register: 'kan', fingering: [true, true, true, false, false, false, false], western: 'F#6', frequency: 1479.98, name: '4' },
  { number: 5, register: 'kan', fingering: [true, true, false, false, false, false, false], western: 'G6', frequency: 1567.98, name: '5' },
  { number: 6, register: 'kan', fingering: [true, false, false, false, false, false, false], western: 'A6', frequency: 1760.0, name: '6' },
  { number: 7, register: 'kan', fingering: [false, false, false, false, false, false, false], western: 'B6', frequency: 1975.53, name: '7' },
  // 大甲
  { number: 1, register: 'daikan', fingering: [false, true, true, true, true, false, false], western: 'C#7', frequency: 2217.46, name: '大1' },
  { number: 2, register: 'daikan', fingering: [true, true, false, true, true, false, false], western: 'D7', frequency: 2349.32, name: '大2' },
  { number: 3, register: 'daikan', fingering: [true, false, true, true, false, false, false], western: 'E7', frequency: 2637.02, name: '大3' },
  { number: 4, register: 'daikan', fingering: [true, false, true, true, false, true, false], western: 'F#7', frequency: 2959.96, name: '大4' },
]

/**
 * 六本調子の運指表
 */
export const FINGERING_CHART_ROKU: ShinobueNote[] = [
  // 呂音
  { number: 1, register: 'ro', fingering: [true, true, true, true, true, true, false], western: 'B4', frequency: 493.88, name: '一' },
  { number: 2, register: 'ro', fingering: [true, true, true, true, true, false, false], western: 'C5', frequency: 523.25, name: '二' },
  { number: 3, register: 'ro', fingering: [true, true, true, true, false, false, false], western: 'D5', frequency: 587.33, name: '三' },
  { number: 4, register: 'ro', fingering: [true, true, true, false, false, false, false], western: 'E5', frequency: 659.25, name: '四' },
  { number: 5, register: 'ro', fingering: [true, true, false, false, false, false, false], western: 'F5', frequency: 698.46, name: '五' },
  { number: 6, register: 'ro', fingering: [true, false, false, false, false, false, false], western: 'G5', frequency: 783.99, name: '六' },
  { number: 7, register: 'ro', fingering: [false, false, false, false, false, false, false], western: 'A5', frequency: 880.0, name: '七' },
  // 甲音
  { number: 1, register: 'kan', fingering: [true, true, true, true, true, true, false], western: 'B5', frequency: 987.77, name: '1' },
  { number: 2, register: 'kan', fingering: [true, true, true, true, true, false, false], western: 'C6', frequency: 1046.5, name: '2' },
  { number: 3, register: 'kan', fingering: [true, true, true, true, false, false, false], western: 'D6', frequency: 1174.66, name: '3' },
  { number: 4, register: 'kan', fingering: [true, true, true, false, false, false, false], western: 'E6', frequency: 1318.51, name: '4' },
  { number: 5, register: 'kan', fingering: [true, true, false, false, false, false, false], western: 'F6', frequency: 1396.91, name: '5' },
  { number: 6, register: 'kan', fingering: [true, false, false, false, false, false, false], western: 'G6', frequency: 1567.98, name: '6' },
  { number: 7, register: 'kan', fingering: [false, false, false, false, false, false, false], western: 'A6', frequency: 1760.0, name: '7' },
  // 大甲
  { number: 1, register: 'daikan', fingering: [false, true, true, true, true, false, false], western: 'B6', frequency: 1975.53, name: '大1' },
  { number: 2, register: 'daikan', fingering: [true, true, false, true, true, false, false], western: 'C7', frequency: 2093.0, name: '大2' },
  { number: 3, register: 'daikan', fingering: [true, false, true, true, false, false, false], western: 'D7', frequency: 2349.32, name: '大3' },
  { number: 4, register: 'daikan', fingering: [true, false, true, true, false, true, false], western: 'E7', frequency: 2637.02, name: '大4' },
]

/**
 * 八本調子の運指表
 */
export const FINGERING_CHART_HACHI: ShinobueNote[] = [
  // 呂音
  { number: 1, register: 'ro', fingering: [true, true, true, true, true, true, false], western: 'D5', frequency: 587.33, name: '一' },
  { number: 2, register: 'ro', fingering: [true, true, true, true, true, false, false], western: 'E5', frequency: 659.25, name: '二' },
  { number: 3, register: 'ro', fingering: [true, true, true, true, false, false, false], western: 'F5', frequency: 698.46, name: '三' },
  { number: 4, register: 'ro', fingering: [true, true, true, false, false, false, false], western: 'G5', frequency: 783.99, name: '四' },
  { number: 5, register: 'ro', fingering: [true, true, false, false, false, false, false], western: 'A5', frequency: 880.0, name: '五' },
  { number: 6, register: 'ro', fingering: [true, false, false, false, false, false, false], western: 'B5', frequency: 987.77, name: '六' },
  { number: 7, register: 'ro', fingering: [false, false, false, false, false, false, false], western: 'C6', frequency: 1046.50, name: '七' },
  // 甲音
  { number: 1, register: 'kan', fingering: [true, true, true, true, true, true, false], western: 'D6', frequency: 1174.66, name: '1' },
  { number: 2, register: 'kan', fingering: [true, true, true, true, true, false, false], western: 'E6', frequency: 1318.51, name: '2' },
  { number: 3, register: 'kan', fingering: [true, true, true, true, false, false, false], western: 'F6', frequency: 1396.91, name: '3' },
  { number: 4, register: 'kan', fingering: [true, true, true, false, false, false, false], western: 'G6', frequency: 1567.98, name: '4' },
  { number: 5, register: 'kan', fingering: [true, true, false, false, false, false, false], western: 'A6', frequency: 1760.0, name: '5' },
  { number: 6, register: 'kan', fingering: [true, false, false, false, false, false, false], western: 'B6', frequency: 1975.53, name: '6' },
  { number: 7, register: 'kan', fingering: [false, false, false, false, false, false, false], western: 'C7', frequency: 2093.0, name: '7' },
  // 大甲
  { number: 1, register: 'daikan', fingering: [false, true, true, true, true, false, false], western: 'D7', frequency: 2349.32, name: '大1' },
  { number: 2, register: 'daikan', fingering: [true, true, false, true, true, false, false], western: 'E7', frequency: 2637.02, name: '大2' },
  { number: 3, register: 'daikan', fingering: [true, false, true, true, false, false, false], western: 'F7', frequency: 2793.83, name: '大3' },
  { number: 4, register: 'daikan', fingering: [true, false, true, true, false, true, false], western: 'G7', frequency: 3135.96, name: '大4' },
]

/** 調子から運指表を取得 */
export function getFingeringChart(key: string): ShinobueNote[] {
  switch (key) {
    case 'roku':
      return FINGERING_CHART_ROKU
    case 'nana':
      return FINGERING_CHART_NANA
    case 'hachi':
      return FINGERING_CHART_HACHI
    default:
      return FINGERING_CHART_NANA
  }
}
