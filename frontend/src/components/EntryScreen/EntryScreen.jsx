import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageContext'
import './EntryScreen.css'

/**
 * Root entry: branding + language selection only.
 * Doctor/Admin links stay top-right (secondary).
 * Patient login lives on the patient page after language is chosen.
 */
const EntryScreen = ({ onSelectLang }) => {
  const { LANGUAGES, lang } = useLanguage()
  const navigate = useNavigate()

  return (
    <div className="entry-root">
      <header className="entry-top">
        <div className="entry-top__spacer" />
        <div className="entry-portal">
          <button
            type="button"
            id="entry-doctor-login-btn"
            className="entry-portal-btn"
            onClick={() => navigate('/doctor')}
          >
            Doctor Login
          </button>
          <button
            type="button"
            id="entry-admin-login-btn"
            className="entry-portal-btn"
            onClick={() => navigate('/admin')}
          >
            Admin Login
          </button>
        </div>
      </header>

      <main className="entry-main">
        <div className="entry-brand">
          <svg className="entry-logo" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <rect width="40" height="40" rx="8" fill="#1565c0" />
            <rect x="17" y="6" width="6" height="28" rx="2" fill="white" />
            <rect x="6" y="17" width="28" height="6" rx="2" fill="white" />
          </svg>
          <h1 className="entry-title">AROGYABODHINI</h1>
          <p className="entry-tagline">AI-Powered Multilingual Healthcare Assistant</p>
        </div>

        <section className="entry-lang" aria-label="Select your language">
          <h2 className="entry-section-title">Select Your Language</h2>
          <div className="entry-lang-grid" role="group">
            {LANGUAGES.map((l) => {
              const selected = lang?.code === l.code
              return (
                <button
                  key={l.code}
                  id={`entry-lang-${l.code}`}
                  type="button"
                  className={`entry-lang-btn${selected ? ' entry-lang-btn--selected' : ''}`}
                  onClick={() => onSelectLang?.(l)}
                  aria-pressed={selected}
                  aria-label={`${l.nativeLabel} – ${l.label}`}
                >
                  <span className="entry-lang-native">{l.nativeLabel}</span>
                  <span className="entry-lang-en">{l.label}</span>
                </button>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}

export default EntryScreen
