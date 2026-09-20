import React, { createContext, useContext, useState, useCallback } from 'react'
import translations from './translations'

export const LANGUAGES = [
  { code: 'en', label: 'English',  nativeLabel: 'English', bcp47: 'en-IN', icon: '🌐', color: '#1565c0' },
  { code: 'kn', label: 'Kannada',  nativeLabel: 'ಕನ್ನಡ',  bcp47: 'kn-IN', icon: '🪷', color: '#e65100' },
  { code: 'hi', label: 'Hindi',    nativeLabel: 'हिन्दी',   bcp47: 'hi-IN', icon: '🕉️', color: '#6a1b9a' },
  { code: 'ta', label: 'Tamil',    nativeLabel: 'தமிழ்',  bcp47: 'ta-IN', icon: '🌺', color: '#00838f' },
  { code: 'te', label: 'Telugu',   nativeLabel: 'తెలుగు', bcp47: 'te-IN', icon: '⭐', color: '#2e7d32' },
]

const STORAGE_KEY = 'ab_lang'

const loadSaved = () => {
  try {
    const code = localStorage.getItem(STORAGE_KEY)
    return LANGUAGES.find(l => l.code === code) || null
  } catch { return null }
}

const LanguageContext = createContext(null)

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(loadSaved)

  const setLang = useCallback((langObj) => {
    try { localStorage.setItem(STORAGE_KEY, langObj.code) } catch {}
    setLangState(langObj)
  }, [])

  /** t(key) — translated string, falls back to English */
  const t = useCallback((key) => {
    const dict = translations[lang?.code] || translations.en
    return dict[key] ?? translations.en[key] ?? key
  }, [lang])

  /** en(key) — always returns the English string */
  const en = useCallback((key) => {
    return translations.en[key] ?? key
  }, [])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, en, LANGUAGES, translations }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}
