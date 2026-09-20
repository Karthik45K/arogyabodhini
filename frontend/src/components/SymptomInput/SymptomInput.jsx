import React, { useState, useRef, useEffect, useCallback } from 'react'
import './SymptomInput.css'
import AnalysisResult from '../AnalysisResult/AnalysisResult'
import { analyzeSymptoms as analyzeAPI } from '../../services/api'
import useSpeechRecognition from '../../hooks/useSpeechRecognition'

/**
 * Language config.
 * `bcp47` is the code passed to the Web Speech API / Whisper in Phase 4.
 */
const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧', bcp47: 'en-IN',
    placeholder: 'Describe your symptoms — e.g. "I have a severe headache and fever for 3 days"' },
  { code: 'kn', label: 'Kannada', flag: '🇮🇳', bcp47: 'kn-IN',
    placeholder: 'ನಿಮ್ಮ ರೋಗಲಕ್ಷಣಗಳನ್ನು ವಿವರಿಸಿ...' },
  { code: 'hi', label: 'Hindi',   flag: '🇮🇳', bcp47: 'hi-IN',
    placeholder: 'अपने लक्षणों का वर्णन करें...' },
  { code: 'ta', label: 'Tamil',   flag: '🇮🇳', bcp47: 'ta-IN',
    placeholder: 'உங்கள் அறிகுறிகளை விவரிக்கவும்...' },
  { code: 'te', label: 'Telugu',  flag: '🇮🇳', bcp47: 'te-IN',
    placeholder: 'మీ లక్షణాలను వివరించండి...' },
]

const MAX = 1000

const SymptomInput = () => {
  const [text, setText]           = useState('')
  const [lang, setLang]           = useState(LANGUAGES[0])
  const [loading, setLoading]     = useState(false)
  const [apiError, setApiError]   = useState(null)
  const [result, setResult]       = useState(null)
  const [langOpen, setLangOpen]   = useState(false)

  const ddRef     = useRef(null)
  const taRef     = useRef(null)
  const resultRef = useRef(null)

  // ── Speech hook ────────────────────────────────────────────────────────
  // Called whenever a final sentence is committed by the speech engine
  const handleFinalResult = useCallback((transcript) => {
    setText(prev => {
      const joined = prev ? `${prev.trimEnd()} ${transcript}` : transcript
      return joined.slice(0, MAX)  // respect character limit
    })
    setApiError(null)
  }, [])

  const {
    isSupported,
    isListening,
    isProcessing,
    interimText,
    error: speechError,
    startListening,
    stopListening,
    clearError: clearSpeechError,
  } = useSpeechRecognition({ onFinalResult: handleFinalResult })

  // ── Close language dropdown on outside click ───────────────────────────
  useEffect(() => {
    const fn = (e) => {
      if (ddRef.current && !ddRef.current.contains(e.target)) setLangOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  // ── Scroll to result panel after render ───────────────────────────────
  useEffect(() => {
    if (result && resultRef.current) {
      setTimeout(() => resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    }
  }, [result])

  // ── Stop listening when language is changed mid-session ───────────────
  const handleLangSelect = (newLang) => {
    if (isListening) stopListening()
    setLang(newLang)
    setLangOpen(false)
    clearSpeechError()
  }

  // ── Mic toggle ────────────────────────────────────────────────────────
  const handleMicToggle = () => {
    if (isListening) {
      stopListening()
    } else {
      clearSpeechError()
      setApiError(null)
      startListening(lang.bcp47)
    }
  }

  // ── Text change ───────────────────────────────────────────────────────
  const onText = (e) => {
    if (e.target.value.length <= MAX) {
      setText(e.target.value)
      setApiError(null)
    }
  }

  // ── Analyze ───────────────────────────────────────────────────────────
  const onSubmit = async (e) => {
    e.preventDefault()

    // Stop mic before submitting
    if (isListening) stopListening()

    const combined = text.trim()
    if (!combined) { taRef.current?.focus(); return }

    setLoading(true)
    setApiError(null)
    setResult(null)

    try {
      const data = await analyzeAPI(combined, lang.code)
      setResult({
        possibleDiseases:      data.possibleDiseases,
        matchedSymptoms:       data.matchedSymptoms || [],
        recommendedSpecialist: data.recommendedSpecialist,
        severity:              data.severity,
        urgencyNote:           data.urgencyNote,
        emergencyFlag:         data.emergencyFlag,
        confidence:            data.confidence,
        analyzedAt:            data.analyzedAt,
      })
    } catch (err) {
      setApiError(err.message || 'Unable to reach the analysis server. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  // ── Reset all ─────────────────────────────────────────────────────────
  const onReset = () => {
    if (isListening) stopListening()
    setResult(null)
    setApiError(null)
    clearSpeechError()
    setText('')
    taRef.current?.focus()
  }

  // ── Derived UI state ───────────────────────────────────────────────────
  // The textarea shows typed text + live interim speech
  const displayText = isListening && interimText
    ? (text ? `${text} ${interimText}` : interimText)
    : text

  const micDisabled   = loading || isProcessing
  const submitDisabled = loading || !text.trim()

  // Mic button label / icon state
  const micState = isListening ? 'recording' : isProcessing ? 'processing' : 'idle'

  return (
    <section id="symptom-input" className="symptom-section section" aria-labelledby="symptom-heading">
      <div className="container">

        {/* ── Section header ── */}
        <div className="section-header anim-up">
          <div className="section-eyebrow">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            Symptom Checker
          </div>
          <h2 id="symptom-heading" className="section-title">
            Describe Your <span className="grad-text">Symptoms</span>
          </h2>
          <p className="section-body">
            Type or <strong>speak</strong> in your native language. Our AI analyzes instantly
            and recommends the right specialist in seconds.
          </p>
        </div>

        {/* ── Main card ── */}
        <div className="symptom-card anim-up d-200">
          <form onSubmit={onSubmit} className="symptom-form" noValidate>

            {/* Top bar — language selector + char count */}
            <div className="symptom-topbar">
              <div className="lang-sel" ref={ddRef}>
                <button
                  type="button"
                  id="lang-selector-btn"
                  className="lang-sel__btn"
                  onClick={() => setLangOpen(p => !p)}
                  aria-haspopup="listbox"
                  aria-expanded={langOpen}
                  aria-label="Select language"
                >
                  <span className="lang-sel__flag">{lang.flag}</span>
                  <span>{lang.label}</span>
                  <svg
                    className={`lang-sel__chevron ${langOpen ? 'lang-sel__chevron--open' : ''}`}
                    width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {langOpen && (
                  <ul className="lang-sel__menu" role="listbox" aria-label="Language options">
                    {LANGUAGES.map(l => (
                      <li key={l.code} role="option" aria-selected={l.code === lang.code}>
                        <button
                          type="button"
                          id={`lang-opt-${l.code}`}
                          className={`lang-sel__opt ${l.code === lang.code ? 'lang-sel__opt--active' : ''}`}
                          onClick={() => handleLangSelect(l)}
                        >
                          <span>{l.flag}</span>
                          <span>{l.label}</span>
                          <span className="lang-sel__bcp47">{l.bcp47}</span>
                          {l.code === lang.code && (
                            <svg className="lang-sel__opt-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Browser support indicator */}
              {!isSupported && (
                <span className="speech-unsupported" title="Voice input requires Chrome or Edge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Voice unavailable in this browser
                </span>
              )}

              <span className={`symptom-char-count ${text.length > MAX * .88 ? 'symptom-char-count--warn' : ''}`}>
                {text.length}/{MAX}
              </span>
            </div>

            {/* Textarea + listening overlay */}
            <div className="symptom-textarea-wrap">
              <textarea
                ref={taRef}
                id="symptom-textarea"
                className={`symptom-textarea ${isListening ? 'symptom-textarea--listening' : ''}`}
                value={displayText}
                onChange={onText}
                placeholder={lang.placeholder}
                rows={6}
                aria-label="Describe your symptoms"
                aria-required="true"
                disabled={loading}
                readOnly={isListening}  // prevent keyboard edits while mic is active
              />

              {/* Live recording overlay */}
              {isListening && (
                <div className="voice-overlay" aria-live="polite" aria-label="Listening for speech">
                  <div className="voice-overlay__pill">
                    <div className="voice-wave">
                      <span/><span/><span/><span/><span/>
                    </div>
                    <span className="voice-overlay__lang">{lang.flag} Listening in {lang.label}…</span>
                    <button
                      type="button"
                      className="voice-overlay__stop"
                      onClick={stopListening}
                      aria-label="Stop recording"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <rect x="4" y="4" width="16" height="16" rx="2"/>
                      </svg>
                      Stop
                    </button>
                  </div>

                  {/* Live interim text */}
                  {interimText && (
                    <p className="voice-overlay__interim" aria-live="polite">
                      {interimText}
                    </p>
                  )}
                </div>
              )}

              {/* Processing state (brief flash after stop) */}
              {isProcessing && (
                <div className="voice-processing" aria-live="polite">
                  <svg className="voice-processing__spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                  </svg>
                  Processing voice…
                </div>
              )}
            </div>

            {/* Speech error */}
            {speechError && (
              <div className="symptom-error" role="alert" aria-live="assertive">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                </svg>
                <span>{speechError}</span>
                <button type="button" className="symptom-error__dismiss" onClick={clearSpeechError} aria-label="Dismiss error">✕</button>
              </div>
            )}

            {/* API error */}
            {apiError && (
              <div className="symptom-error" role="alert" aria-live="assertive">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{apiError}</span>
              </div>
            )}

            {/* Action row */}
            <div className="symptom-actions">

              {/* Mic button */}
              <button
                type="button"
                id="voice-input-btn"
                className={`mic-btn mic-btn--${micState}`}
                onClick={handleMicToggle}
                disabled={micDisabled || !isSupported}
                aria-label={isListening ? `Stop ${lang.label} voice input` : `Start ${lang.label} voice input`}
                aria-pressed={isListening}
                title={!isSupported ? 'Voice input requires Chrome or Edge' : undefined}
              >
                {/* Recording — stop square */}
                {micState === 'recording' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="5" y="5" width="14" height="14" rx="2"/>
                  </svg>
                )}

                {/* Processing — spinner */}
                {micState === 'processing' && (
                  <svg className="mic-btn__spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                  </svg>
                )}

                {/* Idle — mic icon */}
                {micState === 'idle' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                )}

                <span>
                  {micState === 'recording'  ? `Stop (${lang.label})` :
                   micState === 'processing' ? 'Processing…'          :
                   `Speak in ${lang.label}`}
                </span>
              </button>

              <div className="symptom-actions-right">
                <button
                  type="button"
                  id="clear-btn"
                  className="clear-btn"
                  onClick={onReset}
                  disabled={!text && !result && !speechError}
                  aria-label="Clear and reset"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  id="analyze-btn"
                  className={`submit-btn ${loading ? 'submit-btn--loading' : ''}`}
                  disabled={submitDisabled}
                  aria-live="polite"
                >
                  {loading ? (
                    <>
                      <svg className="submit-btn__spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                      </svg>
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      Analyze Symptoms
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Tips strip */}
          <div className="symptom-tips">
            {[
              ['🎤', 'Click "Speak" to use voice — works in Chrome & Edge'],
              ['🔒', 'Encrypted & HIPAA-compliant'],
              ['⚡', 'Results in under 5 seconds'],
            ].map(([icon, tip]) => (
              <div key={tip} className="symptom-tip">
                <span>{icon}</span><span>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Analysis result panel */}
        {result && (
          <div ref={resultRef}>
            <AnalysisResult result={result} onReset={onReset} />
          </div>
        )}

      </div>
    </section>
  )
}

export default SymptomInput
