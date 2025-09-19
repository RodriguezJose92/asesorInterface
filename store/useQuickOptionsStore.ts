import { create } from 'zustand'

interface QuickOptionsStore {
  viewQuickOptions: boolean
  setViewQuicOptions: (value: boolean) => void
  toggleViewQuickOptions: () => void
}

export const useQuickOptionsStore = create<QuickOptionsStore>((set) => ({
  viewQuickOptions: true,
  setViewQuicOptions: (value: boolean) => set({ viewQuickOptions: value }),
  toggleViewQuickOptions: () => set((state) => ({ viewQuickOptions: !state.viewQuickOptions }))
}))