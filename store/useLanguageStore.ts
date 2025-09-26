import { create } from 'zustand'

export type LanguageCode = 'es' | 'en' | 'fr' | 'de' | 'it' | 'pt' | 'ja' | 'ko' | 'zh' | 'es-419'

interface LanguageStore {
    languageCurrent: LanguageCode
    browserLanguage: LanguageCode
    userPreferredLanguage: LanguageCode | null
    setLanguageCurrent: (language: LanguageCode) => void
    setBrowserLanguage: (language: LanguageCode) => void
    setUserPreferredLanguage: (language: LanguageCode) => void
    detectBrowserLanguage: () => LanguageCode
    getEffectiveLanguage: () => LanguageCode
}

// Function to detect browser language
const detectBrowserLanguage = (): LanguageCode => {
    if (typeof window === 'undefined') return 'en'

    const browserLang = navigator.language || navigator.languages?.[0] || 'en'
    const langCode = browserLang.split('-')[0].toLowerCase()

    // Map browser language codes to supported languages
    const supportedLanguages: { [key: string]: LanguageCode } = {
        'es': 'es',
        'en': 'en',
        'fr': 'fr',
        'de': 'de',
        'it': 'it',
        'pt': 'pt',
        'ja': 'ja',
        'ko': 'ko',
        'zh': 'zh'
    }

    return supportedLanguages[langCode] || 'en'
}

export const useLanguageStore = create<LanguageStore>((set, get) => ({
    languageCurrent: 'en',
    browserLanguage: 'en',
    userPreferredLanguage: null,

    setLanguageCurrent: (language: LanguageCode) => set({ languageCurrent: language }),

    setBrowserLanguage: (language: LanguageCode) => set({ browserLanguage: language }),

    setUserPreferredLanguage: (language: LanguageCode) => set({
        userPreferredLanguage: language,
        languageCurrent: language
    }),

    detectBrowserLanguage: () => {
        const detected = detectBrowserLanguage()
        set({ browserLanguage: detected })
        return detected
    },

    getEffectiveLanguage: () => {
        const state = get()
        return state.userPreferredLanguage || state.browserLanguage || state.languageCurrent
    }
}))

// Initialize browser language detection on client side
if (typeof window !== 'undefined') {
    const store = useLanguageStore.getState()
    const detected = store.detectBrowserLanguage()
    store.setLanguageCurrent(detected)
}