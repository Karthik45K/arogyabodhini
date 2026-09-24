import React, { useState, useRef, useCallback } from 'react'
import './HomeScreen.css'
import { useLanguage } from '../../i18n/LanguageContext'
import BilingualText from '../BilingualText/BilingualText'
import { formatDoctorDisplayName } from '../../services/doctorMatchService'

const HomeScreen = ({
  apiError,
  initialText = '',
  upcomingConsultation,
  onStartListening,
  onTextSubmit,
  onJoinVideoRoom
}) => {
  const { t, lang, translations } = useLanguage()
  const [text, setText] = useState(initialText)
  const [loading, setLoading] = useState(false)
  const [showText, setShowText] = useState(Boolean(initialText))
  const textRef = useRef(null)

  const handleAnalyze = useCallback(async (e) => {
    e?.preventDefault?.()
    if (!text.trim()) {
      setShowText(true)
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

  const errorIsKey = Boolean(apiError && translations?.en?.[apiError])

  const hasRealConsult = Boolean(
    upcomingConsultation?.doctorId &&
    upcomingConsultation?.doctorName &&
    (upcomingConsultation.status === 'accepted' || upcomingConsultation.status === 'waiting')
  )
  const doctorDisplayName = formatDoctorDisplayName(upcomingConsultation?.doctorName)
  const canJoin = upcomingConsultation?.status === 'accepted'

  return (
    <div className="home-screen-minimal anim-in">

      {hasRealConsult && (
        <div className="upcoming-call-card">
          <div className="upcoming-call-card__header">
            <span className="upcoming-pulse-dot" />
            <span className="upcoming-label">
              {canJoin ? t('upcomingConsult') : 'Consultation request'}
            </span>
          </div>
          <div className="upcoming-call-card__body">
            <div className="upcoming-doc-avatar">
              {doctorDisplayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="upcoming-doc-meta">
              <h4>Dr. {doctorDisplayName}</h4>
              {!canJoin && (
                <p className="upcoming-waiting-note">Waiting for doctor to accept</p>
              )}
            </div>
          </div>
          {canJoin && (
            <button
              id="join-upcoming-consult-btn"
              className="upcoming-join-btn"
              onClick={() => onJoinVideoRoom?.(upcomingConsultation)}
            >
              {t('joinCall')}
            </button>
          )}
        </div>
      )}

      <div className="simple-hero">
        <h1 className="simple-brand">{t('appName')}</h1>
        <p className="simple-tagline">{t('appTagline')}</p>
        <p className="simple-question">{t('howAreYouFeeling')}</p>

        <div className="mic-container">
          <button
            id="home-mic-btn"
            className="simple-mic-btn"
            onClick={handleVoice}
            aria-label={t('tapAndSpeak')}
            disabled={loading}
          >
            <span className="mic-ripple" aria-hidden="true" />
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>
          <span className="mic-caption">{t('tapAndSpeak')}</span>
        </div>

        <p className="simple-or">{t('orDivider')}</p>

        {!showText ? (
          <button
            type="button"
            id="show-type-input-btn"
            className="simple-type-toggle"
            onClick={() => {
              setShowText(true)
              setTimeout(() => textRef.current?.focus(), 50)
            }}
          >
            {t('typeYourProblem')}
          </button>
        ) : (
          <form className="simple-text-form" onSubmit={handleAnalyze} noValidate>
            <textarea
              ref={textRef}
              id="symptom-text"
              className="simple-textarea"
              value={text}
              onChange={e => setText(e.target.value.slice(0, 1000))}
              placeholder={t('symptomsPlaceholder')}
              rows={3}
              disabled={loading}
              aria-label={t('typeYourProblem')}
            />
            <button
              type="submit"
              id="send-symptoms-btn"
              className="simple-send-btn"
              disabled={loading || !text.trim()}
            >
              {loading ? t('pleaseWait') : t('sendText')}
            </button>
          </form>
        )}

        {apiError && (
          <div className="home-error" role="alert">
            {errorIsKey ? <BilingualText tKey={apiError} as="span" size="md" /> : apiError}
            <button type="button" className="home-error__retry" onClick={() => {
              if (text.trim()) handleAnalyze()
              else handleVoice()
            }}>
              {t('tryAgain')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default HomeScreen
