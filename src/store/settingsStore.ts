import { create } from 'zustand'
import { DEFAULT_SHINOBUE_KEY } from '../shinobue/ShinobueConfig'

export type Theme = 'light' | 'dark' | 'traditional'

interface SettingsState {
  shinobueKey: string
  tuningA4: number
  noiseGate: number
  pitchConfidenceThreshold: number
  theme: Theme
  showDebugPanel: boolean
  setShinobueKey: (key: string) => void
  setTuningA4: (hz: number) => void
  setNoiseGate: (db: number) => void
  setPitchConfidenceThreshold: (threshold: number) => void
  setTheme: (theme: Theme) => void
  setShowDebugPanel: (show: boolean) => void
}

function loadTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'light'
  const saved = localStorage.getItem('shinobue-theme')
  if (saved === 'dark' || saved === 'traditional') return saved
  return 'light'
}

export const useSettingsStore = create<SettingsState>((set) => ({
  shinobueKey: DEFAULT_SHINOBUE_KEY,
  tuningA4: 440,
  noiseGate: -50,
  pitchConfidenceThreshold: 0.5,
  theme: loadTheme(),
  showDebugPanel: false,
  setShinobueKey: (key) => set({ shinobueKey: key }),
  setTuningA4: (hz) => set({ tuningA4: hz }),
  setNoiseGate: (db) => set({ noiseGate: db }),
  setPitchConfidenceThreshold: (threshold) => set({ pitchConfidenceThreshold: threshold }),
  setShowDebugPanel: (show) => set({ showDebugPanel: show }),
  setTheme: (theme) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('shinobue-theme', theme)
    }
    document.documentElement.setAttribute('data-theme', theme === 'light' ? '' : theme)
    set({ theme })
  },
}))
