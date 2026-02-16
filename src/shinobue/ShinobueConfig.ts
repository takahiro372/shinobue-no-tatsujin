import type { ShinobueKey } from '../types/shinobue'

export const SHINOBUE_KEYS: Record<string, ShinobueKey> = {
  roku: {
    name: '六本調子',
    baseNote: 'A4',
    baseFrequency: 440,
    range: { lowest: 440, highest: 2640 },
  },
  nana: {
    name: '七本調子',
    baseNote: 'B4',
    baseFrequency: 494,
    range: { lowest: 494, highest: 2960 },
  },
  hachi: {
    name: '八本調子',
    baseNote: 'C5',
    baseFrequency: 523,
    range: { lowest: 523, highest: 3136 },
  },
}

export const DEFAULT_SHINOBUE_KEY = 'nana'
