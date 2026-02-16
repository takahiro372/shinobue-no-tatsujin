import { create } from 'zustand'
import type { Score } from '../score/ScoreModel'
import type {
  PracticeMode,
  LongToneConfig,
  ScaleConfig,
  SectionConfig,
  PracticeRecord,
  PracticeStats,
} from '../types/practice'

interface PracticeStoreState {
  mode: PracticeMode

  longToneConfig: LongToneConfig
  scaleConfig: ScaleConfig
  sectionConfig: SectionConfig
  sectionScore: Score | null

  recentRecords: PracticeRecord[]
  stats: PracticeStats

  setMode: (mode: PracticeMode) => void
  setLongToneConfig: (partial: Partial<LongToneConfig>) => void
  setScaleConfig: (partial: Partial<ScaleConfig>) => void
  setSectionConfig: (partial: Partial<SectionConfig>) => void
  setSectionScore: (score: Score | null) => void
  setRecentRecords: (records: PracticeRecord[]) => void
  setStats: (stats: PracticeStats) => void
}

const DEFAULT_LONG_TONE_CONFIG: LongToneConfig = {
  targetNoteNumber: 0,
  targetRegister: 'ro',
  duration: 10,
  toleranceCents: 10,
}

const DEFAULT_SCALE_CONFIG: ScaleConfig = {
  pattern: 'ascending',
  tempo: 80,
  metronomeEnabled: true,
  registerFilter: 'all',
}

const DEFAULT_SECTION_CONFIG: SectionConfig = {
  scoreTitle: '',
  startMeasure: 1,
  endMeasure: 4,
  tempoScale: 1.0,
  loopCount: 3,
  gradualSpeedUp: false,
}

const DEFAULT_STATS: PracticeStats = {
  totalSessions: 0,
  totalPracticeMinutes: 0,
  streakDays: 0,
  longToneAverageStability: 0,
  scaleAverageAccuracy: 0,
  sectionAverageAccuracy: 0,
}

export const usePracticeStore = create<PracticeStoreState>((set) => ({
  mode: 'tuner',

  longToneConfig: DEFAULT_LONG_TONE_CONFIG,
  scaleConfig: DEFAULT_SCALE_CONFIG,
  sectionConfig: DEFAULT_SECTION_CONFIG,
  sectionScore: null,

  recentRecords: [],
  stats: DEFAULT_STATS,

  setMode: (mode) => set({ mode }),
  setLongToneConfig: (partial) =>
    set((state) => ({ longToneConfig: { ...state.longToneConfig, ...partial } })),
  setScaleConfig: (partial) =>
    set((state) => ({ scaleConfig: { ...state.scaleConfig, ...partial } })),
  setSectionConfig: (partial) =>
    set((state) => ({ sectionConfig: { ...state.sectionConfig, ...partial } })),
  setSectionScore: (score) => set({ sectionScore: score }),
  setRecentRecords: (records) => set({ recentRecords: records }),
  setStats: (stats) => set({ stats }),
}))
