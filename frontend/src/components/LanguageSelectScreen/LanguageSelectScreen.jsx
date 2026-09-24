import React from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
import './LanguageSelectScreen.css'

const LanguageSelectScreen = ({ onSelect }) => {
  const { LANGUAGES } = useLanguage()

  return (
    <div className="lss-root" role="dialog" aria-modal="true" aria-label="Select language">
      <div className="lss-brand" aria-hidden="true">
        <svg className="lss-logo-svg" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#1565c0"/>
          <rect x="17" y="6" width="6" height="28" rx="2" fill="white"/>
          <rect x="6"  y="17" width="28" height="6" rx="2" fill="white"/>
        </svg>
        <span className="lss-brand__name">AROGYABODHINI</span>
      </div>

      <div className="lss-welcome">
        <h1 className="lss-welcome__title">Choose your language</h1>
      </div>

      <div className="lss-grid" role="group" aria-label="Language options">
        {LANGUAGES.map(l => (
          <button
            key={l.code}
            id={`lang-card-${l.code}`}
            className="lss-card"
            onClick={() => onSelect(l)}
            aria-label={`${l.nativeLabel} – ${l.label}`}
          >
            <span className="lss-card__native">{l.nativeLabel}</span>
            <span className="lss-card__english">{l.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default LanguageSelectScreen
