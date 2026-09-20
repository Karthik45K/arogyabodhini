import React, { useState, useRef, useCallback, useEffect } from 'react'
import './HomeScreen.css'
import { useLanguage } from '../../i18n/LanguageContext'
import BilingualText from '../BilingualText/BilingualText'

const QUICK_SYMPTOMS = [
  'Fever & Chills',
  'Severe Headache',
  'Chest Tightness',
  'Cough & Cold',
  'Stomach Pain',
  'Back Ache'
]

const HomeScreen = ({
  apiError,
  initialText = '',
  upcomingConsultation,
  onStartListening,
  onTextSubmit,
  onOpenAccount,
  onJoinVideoRoom
}) => {
  const { t, en, lang } = useLanguage()
  const [text,    setText]    = useState(initialText)
  const [loading, setLoading] = useState(false)
  const [showInputBox, setShowInputBox] = useState(false)
  const textRef = useRef(null)

  const handleAnalyze = useCallback(async (e) => {
    e?.preventDefault?.()
    if (!text.trim()) {
      textRef.current?.focus()
      return
    }
    setLoading(true)
    await onTextSubmit(text.trim(), lang)
    setLoading(false)
  }, [text, lang, onTextSubmit])

  const handleVoice = useCallback(() => {
    onStartListening(lang)
  }, [lang, onStartListening])

  const handleQuickChip = (symptom) => {
    setText(prev => prev ? `${prev}, ${symptom}` : symptom)
    setShowInputBox(true)
  }

  useEffect(() => {
    const btn = document.getElementById('home-mic-btn')
    if (!btn) return
    const id = setInterval(() => {
      btn.classList.add('pulse-invite')
      setTimeout(() => btn.classList.remove('pulse-invite'), 800)
    }, 4500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="home-screen-minimal anim-in">
      
      {/* ── Upcoming Appointment Card (If scheduled) ── */}
      {upcomingConsultation && (
        <div className="upcoming-call-card">
          <div className="upcoming-call-card__header">
            <span className="upcoming-pulse-dot" />
            <span className="upcoming-label">Upcoming Online Consultation</span>
            <span className="upcoming-slot-chip">{upcomingConsultation.slot || 'Scheduled'}</span>
          </div>
          <div className="upcoming-call-card__body">
            <div className="upcoming-doc-avatar">
              {(upcomingConsultation.doctorName || 'Dr').slice(0, 2).toUpperCase()}
            </div>
            <div className="upcoming-doc-meta">
              <h4>Dr. {upcomingConsultation.doctorName}</h4>
              <p>{upcomingConsultation.doctorSpecialty || 'Specialist'} · 🎥 Video Consultation</p>
            </div>
          </div>
          <button
            id="join-upcoming-consult-btn"
            className="upcoming-join-btn"
            onClick={() => onJoinVideoRoom?.(upcomingConsultation.id, upcomingConsultation.patientName)}
          >
            🎥 Enter Consultation Room
          </button>
        </div>
      )}

      {/* ── Quick Fingertip Action Pills ── */}
      <div className="fingertip-bar">
        <button className="fingertip-pill fingertip-pill--active" onClick={() => setShowInputBox(false)}>
          🎙️ Voice AI
        </button>
        <button className="fingertip-pill" onClick={() => { setShowInputBox(true); textRef.current?.focus() }}>
          ✏️ Type Symptoms
        </button>
        {onOpenAccount && (
          <button className="fingertip-pill" onClick={onOpenAccount}>
            📋 My Records
          </button>
        )}
      </div>

      {/* ── Main Voice & Triage Section ── */}
      <div className="minimal-hero">
        <div className="hero-text-block">
          <span className="hero-badge">AI Multilingual Healthcare</span>
          <h1 className="hero-title">
            Speak Your Health Concerns
          </h1>
          <p className="hero-subtitle">
            Voice-first clinical triage in <strong>{lang?.nativeLabel || lang?.label || 'your language'}</strong>. Instant advice and video consultation.
          </p>
        </div>

        {/* Big Fingertip Mic Button */}
        <div className="mic-container">
          <button
            id="home-mic-btn"
            className="minimal-mic-btn"
            onClick={handleVoice}
            aria-label={`${en('stepSpeak')} — ${lang?.label}`}
          >
            <span className="mic-ripple" aria-hidden="true" />
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>
          <span className="mic-caption">Tap to speak with AI Doctor</span>
        </div>

        {/* Quick Symptoms Chips */}
        <div className="quick-chips-wrapper">
          <span className="quick-chips-label">Common symptoms:</span>
          <div className="quick-chips-scroll">
            {QUICK_SYMPTOMS.map(s => (
              <button
                key={s}
                type="button"
                className="quick-symptom-chip"
                onClick={() => handleQuickChip(s)}
              >
                + {s}
              </button>
            ))}
          </div>
        </div>

        {/* Text Input Drawer / Form */}
        {(showInputBox || text.length > 0) && (
          <form className="minimal-text-form anim-up" onSubmit={handleAnalyze} noValidate>
            <textarea
              ref={textRef}
              id="symptom-text"
              className="minimal-textarea"
              value={text}
              onChange={e => setText(e.target.value.slice(0, 1000))}
              placeholder="Describe your symptoms (e.g. fever since 2 days, headache, mild throat pain)..."
              rows={3}
              disabled={loading}
            />

            {apiError && (
              <div className="home-error" role="alert">
                ⚠️ {apiError}
              </div>
            )}

            <button
              type="submit"
              id="analyze-btn"
              className="minimal-analyze-btn"
              disabled={loading || !text.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner-mini" aria-hidden="true" />
                  <span>Analyzing Symptoms...</span>
                </>
              ) : (
                <>
                  <span>Analyze Symptoms</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      <footer className="minimal-footer">
        <p>🔒 256-bit Encrypted Telemedicine · Govt of India Health Compliance</p>
      </footer>
    </div>
  )
}

export default HomeScreen
