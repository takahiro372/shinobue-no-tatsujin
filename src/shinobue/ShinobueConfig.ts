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
    baseFrequency: 493.88,
    range: { lowest: 493.88, highest: 2959.96 },
  },
  hachi: {
    name: '八本調子',
    baseNote: 'C5',
    baseFrequency: 523.25,
    range: { lowest: 523.25, highest: 3135.96 },
  },
}

export const DEFAULT_SHINOBUE_KEY = 'hachi'
