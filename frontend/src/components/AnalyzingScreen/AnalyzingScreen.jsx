import React from 'react'
import './AnalyzingScreen.css'
import { useLanguage } from '../../i18n/LanguageContext'
import BilingualText from '../BilingualText/BilingualText'

const AnalyzingScreen = ({ messageKey = 'understandingSymptoms', onHome }) => {
  const { en, t } = useLanguage()
  return (
    <div className="analyzing-screen anim-in" aria-live="polite" aria-label={en(messageKey)}>
      <div className="analyzing-icon" aria-hidden="true">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none"
          stroke="#1565c0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      </div>

      <div className="analyzing-spinner" aria-hidden="true">
        <div className="analyzing-spinner__ring"/>
      </div>

      <h2 className="analyzing-title">
        <BilingualText tKey={messageKey} as="span" size="lg" />
      </h2>
      <p className="analyzing-wait">
        <BilingualText tKey="pleaseWait" as="span" size="md" />
      </p>

      <div className="analyzing-dots" aria-hidden="true">
        <span/><span/><span/>
      </div>

      {onHome && (
        <button type="button" className="analyzing-home-btn" onClick={onHome}>
          {t('goHome')}
        </button>
      )}
    </div>
  )
}

export default AnalyzingScreen
