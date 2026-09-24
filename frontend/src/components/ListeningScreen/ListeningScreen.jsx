import React, { useState, useCallback, useEffect, useRef } from 'react'
import './ListeningScreen.css'
import useSpeechRecognition from '../../hooks/useSpeechRecognition'
import { useLanguage } from '../../i18n/LanguageContext'
import BilingualText from '../BilingualText/BilingualText'

const ListeningScreen = ({ lang, onDone, onCancel }) => {
  const { t } = useLanguage()
  const [transcript, setTranscript] = useState('')
  const [hearError, setHearError] = useState(false)
  const finishedRef = useRef(false)

  const resolveBcp47 = (l) => {
    if (!l) return 'en-IN'
    if (typeof l === 'object' && l.bcp47) return l.bcp47
    const code = typeof l === 'object' ? l.code : l
    const map = { kn: 'kn-IN', ta: 'ta-IN', te: 'te-IN', hi: 'hi-IN', en: 'en-IN' }
    return map[code] || 'en-IN'
  }

  const handleSessionComplete = useCallback((text) => {
    if (finishedRef.current) return
    const finalText = String(text || '').trim()
    if (!finalText) {
      setHearError(true)
      return
    }
    finishedRef.current = true
    onDone(finalText)
  }, [onDone])

  const handleFinalChunk = useCallback((text) => {
    setTranscript(prev => {
      const joined = prev ? `${prev.trimEnd()} ${text}` : text
      return joined.slice(0, 1000)
    })
  }, [])

  const {
    isSupported, isListening,
    interimText, error: speechError,
    startListening, clearError,
  } = useSpeechRecognition({
    autoEnd: true,
    onFinalResult: handleFinalChunk,
    onSessionComplete: handleSessionComplete,
  })

  useEffect(() => {
    finishedRef.current = false
    if (isSupported) startListening(resolveBcp47(lang))
    // Speech session is aborted by the hook on unmount so Home/cancel
    // does not submit a partial transcript.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const retryListening = () => {
    finishedRef.current = false
    setHearError(false)
    setTranscript('')
    clearError()
    startListening(resolveBcp47(lang))
  }

  const displayText = isListening && interimText
    ? (transcript ? `${transcript} ${interimText}` : interimText)
    : transcript

  const permissionDenied = Boolean(speechError && /denied|not allowed|permission/i.test(speechError))
  const showRetry = hearError || permissionDenied || Boolean(speechError) || !isSupported

  return (
    <div className="listening-screen anim-in">

      <div className="listening-anim" aria-hidden="true">
        <div className={`listening-circle ${isListening ? 'listening-circle--active' : ''}`}>
          <div className="listening-ripple listening-ripple--1"/>
          <div className="listening-ripple listening-ripple--2"/>
          <div className="listening-ripple listening-ripple--3"/>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8"  y1="23" x2="16" y2="23"/>
          </svg>
        </div>
      </div>

      {!isSupported ? (
        <div className="listening-unsupported">
          <BilingualText tKey="voiceUnsupported" as="p" size="sm" />
        </div>
      ) : permissionDenied ? (
        <p className="listening-status" role="alert">
          <BilingualText tKey="micDenied" as="span" size="md" />
        </p>
      ) : hearError || speechError ? (
        <p className="listening-status" role="alert">
          <BilingualText tKey="couldNotHear" as="span" size="md" />
        </p>
      ) : isListening ? (
        <>
          <p className="listening-status listening-status--active">
            <span className="listening-dot" aria-hidden="true"/>
            <BilingualText tKey="listening" as="span" size="md" />
          </p>
          <p className="listening-sublabel">
            {t('speakClearly')}
          </p>
        </>
      ) : (
        <p className="listening-status">
          <BilingualText tKey="processingVoice" as="span" size="md" />
        </p>
      )}

      {isListening && (
        <div className="listening-wave" aria-hidden="true">
          {[...Array(7)].map((_, i) => (
            <span key={i} className="listening-wave__bar" style={{ animationDelay: `${i * 0.1}s` }}/>
          ))}
        </div>
      )}

      {displayText && !showRetry && (
        <div className="listening-transcript" aria-live="polite">
          <p className="listening-transcript__text">{displayText}</p>
        </div>
      )}

      <div className="listening-actions">
        {showRetry && (
          <button
            id="retry-listening-btn"
            type="button"
            className="listening-btn listening-btn--restart"
            onClick={retryListening}
          >
            {t('tryAgain')}
          </button>
        )}
        <button id="cancel-listening-btn" className="listening-btn listening-btn--cancel"
          onClick={onCancel}>
          <BilingualText tKey="goHome" as="span" size="sm" />
        </button>
      </div>
    </div>
  )
}

export default ListeningScreen
