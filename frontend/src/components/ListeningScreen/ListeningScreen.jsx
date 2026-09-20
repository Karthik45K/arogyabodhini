import React, { useState, useCallback, useEffect } from 'react'
import './ListeningScreen.css'
import useSpeechRecognition from '../../hooks/useSpeechRecognition'
import { useLanguage } from '../../i18n/LanguageContext'
import BilingualText from '../BilingualText/BilingualText'

const ListeningScreen = ({ lang, onDone, onCancel }) => {
  const { t, en } = useLanguage()
  const [transcript, setTranscript] = useState('')

  const handleFinalResult = useCallback((text) => {
    setTranscript(prev => {
      const joined = prev ? `${prev.trimEnd()} ${text}` : text
      return joined.slice(0, 1000)
    })
  }, [])

  const {
    isSupported, isListening, isProcessing,
    interimText, error: speechError,
    startListening, stopListening, clearError,
  } = useSpeechRecognition({ onFinalResult: handleFinalResult })

  useEffect(() => {
    if (isSupported) startListening(lang.bcp47)
    return () => { stopListening() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const displayText = isListening && interimText
    ? (transcript ? `${transcript} ${interimText}` : interimText)
    : transcript

  return (
    <div className="listening-screen anim-in">

      {/* Mic animation */}
      <div className="listening-anim" aria-hidden="true">
        <div className={`listening-circle ${isListening ? 'listening-circle--active' : ''}`}>
          <div className="listening-ripple listening-ripple--1"/>
          <div className="listening-ripple listening-ripple--2"/>
          <div className="listening-ripple listening-ripple--3"/>
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8"  y1="23" x2="16" y2="23"/>
          </svg>
        </div>
      </div>

      {/* Status */}
      {!isSupported ? (
        <div className="listening-unsupported">
          <BilingualText tKey="voiceUnsupported" as="p" size="sm" />
        </div>
      ) : isListening ? (
        <>
          <p className="listening-status listening-status--active">
            <span className="listening-dot" aria-hidden="true"/>
            <BilingualText tKey="listening" as="span" size="md" />
          </p>
          <p className="listening-sublabel">
            {en('speakClearly')} — {lang.nativeLabel}
          </p>
        </>
      ) : isProcessing ? (
        <p className="listening-status">
          <BilingualText tKey="processingVoice" as="span" size="md" />
        </p>
      ) : (
        <p className="listening-status">
          <BilingualText tKey="ready" as="span" size="md" />
        </p>
      )}

      {/* Wave */}
      {isListening && (
        <div className="listening-wave" aria-hidden="true">
          {[...Array(7)].map((_, i) => (
            <span key={i} className="listening-wave__bar" style={{ animationDelay: `${i * 0.1}s` }}/>
          ))}
        </div>
      )}

      {/* Transcript */}
      {displayText && (
        <div className="listening-transcript" aria-live="polite">
          <p className="listening-transcript__label">
            <BilingualText tKey="whatYouSaid" as="span" size="sm" />
          </p>
          <p className="listening-transcript__text">{displayText}</p>
        </div>
      )}

      {/* Speech error */}
      {speechError && (
        <div className="listening-error" role="alert">
          ⚠️ {speechError}
          <button onClick={clearError} aria-label="Dismiss" className="listening-error__close">✕</button>
        </div>
      )}

      {/* Actions */}
      <div className="listening-actions">
        {isListening ? (
          <button id="stop-listening-btn" className="listening-btn listening-btn--stop"
            onClick={stopListening} aria-label={en('stopBtn')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="5" y="5" width="14" height="14" rx="2"/>
            </svg>
            <BilingualText tKey="stopBtn" as="span" size="sm" />
          </button>
        ) : (
          transcript && (
            <button id="submit-transcript-btn" className="listening-btn listening-btn--submit"
              onClick={() => onDone(transcript.trim())} disabled={isProcessing}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <BilingualText tKey="analyzeBtn" as="span" size="sm" />
            </button>
          )
        )}
        <button id="cancel-listening-btn" className="listening-btn listening-btn--cancel"
          onClick={onCancel}>
          <BilingualText tKey="backBtn" as="span" size="sm" />
        </button>
      </div>
    </div>
  )
}

export default ListeningScreen
