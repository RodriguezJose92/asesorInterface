import { create } from 'zustand'

type LanguageCode = 'es' | 'en'

interface LanguageStore {
    languageCurrent: LanguageCode
    setLanguageCurrent: (language: LanguageCode) => void
}

export const useLanguageStore = create<LanguageStore>((set) => ({
    languageCurrent: 'en', // Default to English
    setLanguageCurrent: (language: LanguageCode) => set({ languageCurrent: language })
}))