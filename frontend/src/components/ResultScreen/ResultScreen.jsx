import React from 'react'
import './ResultScreen.css'
import { useLanguage } from '../../i18n/LanguageContext'
import BilingualText from '../BilingualText/BilingualText'
import { getDiseaseName } from '../../utils/predictionDisplay'

const SPECIALIST_ICONS = {
  'Cardiologist':'🫀','Neurologist':'🧠','General Physician':'🩺',
  'Gastroenterologist':'🔬','Orthopedic Surgeon':'🦴','Dermatologist':'💊',
  'Ophthalmologist':'👁️','Urologist':'🧪','Psychiatrist':'🧘','Endocrinologist':'⚗️',
}

const ResultScreen = ({ result, onSpeakAgain, onTryAgain, onFindDoctors }) => {
  const { t, en } = useLanguage()

  if (result.noMatch) {
    return (
      <div className="result-screen anim-in">
        <div className="result-screen__inner">
          <div className="result-header">
            <div className="result-header__check" aria-hidden="true">ℹ️</div>
            <div>
              <h2 className="result-header__title">No matching symptoms found</h2>
              <p className="result-header__time">Please try different words.</p>
            </div>
          </div>

          <div className="result-note" role="alert">
            <span aria-hidden="true">💡</span>
            <p>{result.noMatchMessage}</p>
          </div>

          <div className="result-section">
            <h3 className="result-section__title">Your symptoms</h3>
            <p>{result.inputSymptoms}</p>
          </div>

          <div className="result-actions">
            <button id="try-again-btn" className="result-btn result-btn--primary" onClick={onTryAgain}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const SEVERITY_CONFIG = {
    Emergency: { color:'#c62828', bg:'#ffebee', border:'#ef9a9a', icon:'🚨', tKey:'emergency' },
    High:     { color:'#c62828', bg:'#ffebee', border:'#ef9a9a', icon:'🚨', tKey:'severityHigh' },
    Moderate: { color:'#e65100', bg:'#fff3e0', border:'#ffcc80', icon:'⚠️', tKey:'severityMod'  },
    Low:      { color:'#2e7d32', bg:'#e8f5e9', border:'#a5d6a7', icon:'✅', tKey:'severityLow'  },
  }

  const severityObject = typeof result.severity === 'object' && result.severity
    ? result.severity
    : { level: 1, label: result.severity || 'Low', baselineLevel: 1, redFlagsDetected: false, reasons: [] }
  const sev = SEVERITY_CONFIG[severityObject.label] || SEVERITY_CONFIG.Low
  const specialistIcon = SPECIALIST_ICONS[result.recommendedSpecialist] || '👨‍⚕️'
  const severityReason = severityObject.reasons?.[0] || 'Your reported symptoms may require prompt medical evaluation.'

  return (
    <div className="result-screen anim-in">
      <div className="result-screen__inner">

        {/* Header */}
        <div className="result-header">
          <div className="result-header__check" aria-hidden="true">✓</div>
          <div>
            <h2 className="result-header__title">
              <BilingualText tKey="analysisComplete" as="span" size="md" />
            </h2>
            <p className="result-header__time">
              {new Date(result.analyzedAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
            </p>
          </div>
        </div>

        {/* Emergency */}
        {(result.emergencyFlag || severityObject.level >= 4) && (
          <div className="result-emergency" role="alert" aria-live="assertive">
            <span className="result-emergency__icon" aria-hidden="true">🚨</span>
            <div>
              <p className="result-emergency__title">
                <BilingualText tKey="emergency" as="span" size="md" />
              </p>
              <p className="result-emergency__text">{result.urgencyNote || 'Your reported symptoms include warning signs that may require immediate medical evaluation.'}</p>
            </div>
          </div>
        )}

        {/* Severity */}
        <div className="result-severity"
          style={{ background:sev.bg, borderColor:sev.border, color:sev.color }}
          aria-label={severityObject.label || 'Low'}>
          <span className="result-severity__icon" aria-hidden="true">{sev.icon}</span>
          <span className="result-severity__label">{severityObject.label || 'Low'}</span>
        </div>

        {severityReason && (
          <div className="result-note" role="note">
            <span aria-hidden="true">ℹ️</span>
            <p>{severityReason}</p>
          </div>
        )}

        {/* Diseases */}
        <div className="result-section">
          <h3 className="result-section__title">
            <span aria-hidden="true">🦠</span>{' '}
            <BilingualText tKey="possibleConditions" as="span" size="sm" />
          </h3>
          <ul className="result-disease-list" aria-label={en('possibleConditions')}>
            {(result.possibleDiseases || []).map((d, i) => {
              const name = getDiseaseName(d)
              return (
                <li key={name || i} className="result-disease-item">
                  <span className="result-disease-item__dot" aria-hidden="true"/>
                  <span>{name}</span>
                </li>
              )
            })}
          </ul>
        </div>

        {result.matchedSymptoms?.length > 0 && (
          <div className="result-section">
            <h3 className="result-section__title">
              <span aria-hidden="true">🔎</span>{' '}
              Matched symptoms
            </h3>
            <div className="result-matched-chips">
              {result.matchedSymptoms.map((symptom, index) => (
                <React.Fragment key={symptom}>
                  <span className="result-matched-chip">{symptom}</span>
                  {index < result.matchedSymptoms.length - 1 && <span aria-hidden="true">, </span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Specialist – kept in English (Part 5) */}
        <div className="result-section">
          <h3 className="result-section__title">
            <span aria-hidden="true">👨‍⚕️</span>{' '}
            <BilingualText tKey="seeThisDoctor" as="span" size="sm" />
          </h3>
          <div className="result-specialist">
            <span className="result-specialist__icon" aria-hidden="true">{specialistIcon}</span>
            {/* Specialization stays in English */}
            <span className="result-specialist__name">{result.recommendedSpecialist}</span>
          </div>
        </div>

        {/* Urgency note (non-emergency) */}
        {result.urgencyNote && !result.emergencyFlag && (
          <div className="result-note" role="note">
            <span aria-hidden="true">ℹ️</span>
            <p>{result.urgencyNote}</p>
          </div>
        )}

        <p className="result-disclaimer">
          <BilingualText tKey="aiDisclaimer" as="span" size="sm" />
        </p>

        {/* Actions */}
        <div className="result-actions">
          <button id="find-doctor-btn" className="result-btn result-btn--primary" onClick={onFindDoctors}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <BilingualText tKey="findDoctor" as="span" size="sm" />
          </button>
          <button id="speak-again-btn" className="result-btn result-btn--secondary" onClick={onSpeakAgain}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.68"/>
            </svg>
            <BilingualText tKey="speakAgain" as="span" size="sm" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResultScreen
