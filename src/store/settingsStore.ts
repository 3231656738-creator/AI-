import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AppSettings, DEFAULT_SETTINGS } from '../types'

interface SettingsState extends AppSettings {
  updateSettings: (partial: Partial<AppSettings>) => void
  resetSettings: () => void
  isConfigured: () => boolean
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      updateSettings: (partial) => set((state) => ({ ...state, ...partial })),

      resetSettings: () => set(DEFAULT_SETTINGS),

      isConfigured: () => {
        const state = get()
        return !!(state.doubaoApiKey && state.doubaoModelId && state.deepseekApiKey)
      },
    }),
    {
      name: 'ai-debate-settings',
    }
  )
)
