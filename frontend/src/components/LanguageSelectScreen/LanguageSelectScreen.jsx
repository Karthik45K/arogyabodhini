import React, { useState } from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
import './LanguageSelectScreen.css'

const LanguageSelectScreen = ({ onSelect }) => {
  const { LANGUAGES } = useLanguage()
  const [selected, setSelected] = useState(null)

  const handleContinue = () => {
    if (selected) onSelect(selected)
  }

  return (
    <div className="lss-root" role="dialog" aria-modal="true" aria-label="Select language">

      {/* Brand */}
      <div className="lss-brand" aria-hidden="true">
        <svg className="lss-logo-svg" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#1565c0"/>
          <rect x="17" y="6" width="6" height="28" rx="2" fill="white"/>
          <rect x="6"  y="17" width="28" height="6" rx="2" fill="white"/>
        </svg>
        <span className="lss-brand__name">AROGYABODHINI</span>
        <span className="lss-brand__tag">AI Multilingual Healthcare Assistant</span>
      </div>

      {/* Welcome heading */}
      <div className="lss-welcome">
        <h1 className="lss-welcome__title">Welcome</h1>
        <p className="lss-welcome__sub">Please select your preferred language to continue.</p>
      </div>

      {/* Language cards */}
      <div className="lss-grid" role="group" aria-label="Language options">
        {LANGUAGES.map(l => (
          <button
            key={l.code}
            id={`lang-card-${l.code}`}
            className={`lss-card ${selected?.code === l.code ? 'lss-card--selected' : ''}`}
            onClick={() => setSelected(l)}
            aria-pressed={selected?.code === l.code}
            aria-label={`${l.nativeLabel} – ${l.label}`}
          >
            <span className="lss-card__native">{l.nativeLabel}</span>
            <span className="lss-card__english">{l.label}</span>
          </button>
        ))}
      </div>

      {/* Continue button */}
      <button
        id="lang-continue-btn"
        className={`lss-continue ${selected ? 'lss-continue--active' : ''}`}
        onClick={handleContinue}
        disabled={!selected}
        aria-label="Continue with selected language"
      >
        Continue →
      </button>
    </div>
  )
}

export default LanguageSelectScreen
