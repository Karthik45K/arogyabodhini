import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useLanguage, LANGUAGES } from '../../i18n/LanguageContext'
import { usePatientAuth } from '../../patient/context/PatientContext'
import useSpeechRecognition from '../../hooks/useSpeechRecognition'
import {
  normalizePhone,
  normalizeEmail,
  normalizePatientName,
  speechCodeForLang,
} from '../../utils/voiceNormalize'
import './PatientIdentityScreen.css'

const PatientIdentityScreen = ({ onDone }) => {
  const { t, lang, setLang } = useLanguage()
  const { continueWithPhone } = usePatientAuth()
  const [step, setStep] = useState('mode')
  const [inputMode, setInputMode] = useState(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [nameHint, setNameHint] = useState('')
  const pendingFieldRef = useRef(null)
  const startListeningRef = useRef(null)

  const bcp47 = speechCodeForLang(lang)

  const voicePromptFor = useCallback((field) => {
    if (field === 'name') return t('sayYourName')
    if (field === 'phone') return t('sayYourMobile')
    if (field === 'email') return t('sayYourEmail')
    return ''
  }, [t])

  const advanceAfterSpeak = useCallback((field, value) => {
    if (field === 'name') {
      const { latin, needsTypingFallback, original } = normalizePatientName(value)
      if (needsTypingFallback) {
        setNameHint(original)
        setName('')
        setError(t('nameLatinHint'))
        setInputMode('type')
        setStep('type_form')
        pendingFieldRef.current = null
        return
      }
      setName(latin)
      setNameHint('')
      pendingFieldRef.current = 'phone'
      setPrompt(voicePromptFor('phone'))
      setStep('phone')
      setTimeout(() => startListeningRef.current?.(bcp47), 400)
      return
    }
    if (field === 'phone') {
      const digits = normalizePhone(value)
      if (digits.length !== 10) {
        setPhone(digits)
        setError(t('invalidMobile'))
        pendingFieldRef.current = 'phone'
        setPrompt(voicePromptFor('phone'))
        setStep('phone')
        setTimeout(() => startListeningRef.current?.(bcp47), 600)
        return
      }
      setPhone(digits)
      setError('')
      pendingFieldRef.current = 'email'
      setPrompt(voicePromptFor('email'))
      setStep('email')
      setTimeout(() => startListeningRef.current?.(bcp47), 400)
      return
    }
    if (field === 'email') {
      setEmail(normalizeEmail(value))
      pendingFieldRef.current = null
      setStep('confirm')
    }
  }, [bcp47, t, voicePromptFor])

  const handleSpoken = useCallback((text) => {
    const field = pendingFieldRef.current
    if (!field || !text) return
    pendingFieldRef.current = null
    advanceAfterSpeak(field, text)
  }, [advanceAfterSpeak])

  const {
    isSupported,
    isListening,
    interimText,
    error: speechError,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onFinalResult: handleSpoken,
    onSessionComplete: handleSpoken,
    autoEnd: true,
  })

  useEffect(() => {
    startListeningRef.current = startListening
  }, [startListening])

  useEffect(() => {
    if (speechError) setError(speechError)
  }, [speechError])

  const startSpeakField = (field) => {
    setError('')
    setPrompt(voicePromptFor(field))
    pendingFieldRef.current = field
    setStep(field)
    try {
      startListening(bcp47)
    } catch {
      setError(t('voiceUnavailable'))
      setInputMode('type')
      setStep('type_form')
    }
  }

  const beginSpeakFlow = () => {
    setInputMode('speak')
    setNameHint('')
    if (!isSupported) {
      setError(t('voiceUnsupportedShort'))
      setInputMode('type')
      setStep('type_form')
      return
    }
    startSpeakField('name')
  }

  const beginTypeFlow = () => {
    setInputMode('type')
    setStep('type_form')
    setPrompt('')
    pendingFieldRef.current = null
  }

  const digits = normalizePhone(phone)
  const cleanEmail = normalizeEmail(email)

  const handleConfirm = async () => {
    setError('')
    const { latin, needsTypingFallback } = normalizePatientName(name)
    if (needsTypingFallback || !latin.trim() || digits.length !== 10) {
      setError(t('identityError'))
      return
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError(t('emailRequired'))
      return
    }
    setLoading(true)
    try {
      await continueWithPhone(latin.trim(), digits, cleanEmail, lang?.code || 'en')
      onDone?.()
    } catch (err) {
      setError(err.message || t('unableToContinue'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pis-root">
      <h1 className="pis-brand">AROGYABODHINI</h1>
      <p className="pis-title">{t('patientLogin')}</p>
      <p className="pis-sub">{t('identityHint')}</p>

      {step === 'mode' && (
        <div className="pis-mode-row">
          <button type="button" className="pis-mode-btn" onClick={beginSpeakFlow}>
            <span className="pis-mode-icon">🎤</span>
            {t('voiceBasedLogin')}
          </button>
          <button type="button" className="pis-mode-btn" onClick={beginTypeFlow}>
            <span className="pis-mode-icon">⌨️</span>
            {t('textBasedLogin')}
          </button>
        </div>
      )}

      {(step === 'name' || step === 'phone' || step === 'email') && inputMode === 'speak' && (
        <div className="pis-voice-card">
          <p className="pis-prompt">{prompt}</p>
          <p className="pis-status">
            {isListening
              ? t('listening')
              : interimText
                ? t('whatYouSaid')
                : t('preparingMic')}
          </p>
          {(interimText || (step === 'name' && name) || (step === 'phone' && phone) || (step === 'email' && email)) && (
            <p className="pis-heard">
              {interimText || (step === 'name' ? name : step === 'phone' ? phone : email)}
            </p>
          )}
          <div className="pis-voice-actions">
            {isListening ? (
              <button type="button" className="pis-btn pis-btn--secondary" onClick={stopListening}>
                {t('stopBtn')}
              </button>
            ) : (
              <button type="button" className="pis-btn" onClick={() => startSpeakField(step)}>
                {t('speakAgain')}
              </button>
            )}
            <button type="button" className="pis-btn pis-btn--secondary" onClick={beginTypeFlow}>
              {t('typeInstead')}
            </button>
          </div>
        </div>
      )}

      {step === 'type_form' && (
        <form
          className="pis-form"
          onSubmit={(e) => {
            e.preventDefault()
            const { latin, needsTypingFallback } = normalizePatientName(name)
            if (needsTypingFallback || !latin.trim()) {
              setError(t('nameLatinHint'))
              return
            }
            setName(latin)
            if (normalizePhone(phone).length !== 10) {
              setError(t('invalidMobile'))
              return
            }
            setStep('confirm')
          }}
        >
          {nameHint && (
            <p className="pis-sub" style={{ marginBottom: 8 }}>
              {t('heardAs')}: <strong>{nameHint}</strong>
            </p>
          )}
          <label>
            {t('fullName')}
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('nameLatinPlaceholder')}
              required
            />
          </label>
          <label>
            {t('mobileNumber')}
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ''))}
              placeholder="9876543210"
              required
            />
          </label>
          <label>
            {t('emailLabel')}
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </label>
          <label>
            {t('preferredLanguage')}
            <select
              value={lang?.code || 'en'}
              onChange={(e) => {
                const next = LANGUAGES.find((l) => l.code === e.target.value)
                if (next) setLang(next)
              }}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.nativeLabel} ({l.label})</option>
              ))}
            </select>
          </label>
          <button type="submit" className="pis-btn">{t('continue')}</button>
          <button type="button" className="pis-btn pis-btn--secondary" onClick={() => setStep('mode')}>
            {t('backBtn')}
          </button>
        </form>
      )}

      {step === 'confirm' && (
        <div className="pis-confirm-card">
          <p className="pis-prompt">{t('confirmDetails')}</p>
          <div className="pis-confirm-grid">
            <div><span>{t('fullName')}</span><strong>{normalizePatientName(name).latin || name.trim() || '—'}</strong></div>
            <div><span>{t('mobileNumber')}</span><strong>{digits || '—'}</strong></div>
            <div><span>{t('emailLabel')}</span><strong>{cleanEmail || '—'}</strong></div>
            <div><span>{t('preferredLanguage')}</span><strong>{lang?.nativeLabel || lang?.label || 'English'}</strong></div>
          </div>
          {error && <p className="pis-error" role="alert">{error}</p>}
          <button type="button" className="pis-btn" disabled={loading} onClick={handleConfirm}>
            {loading ? t('pleaseWait') : t('confirm')}
          </button>
          <button
            type="button"
            className="pis-btn pis-btn--secondary"
            onClick={() => setStep(inputMode === 'speak' ? 'mode' : 'type_form')}
          >
            {t('edit')}
          </button>
          {inputMode === 'speak' && (
            <div className="pis-voice-actions" style={{ marginTop: 8 }}>
              <button type="button" className="pis-linkish" onClick={() => startSpeakField('name')}>
                {t('speakAgain')} — {t('fullName')}
              </button>
              <button type="button" className="pis-linkish" onClick={() => startSpeakField('phone')}>
                {t('speakAgain')} — {t('mobileNumber')}
              </button>
              <button type="button" className="pis-linkish" onClick={() => startSpeakField('email')}>
                {t('speakAgain')} — {t('emailLabel')}
              </button>
            </div>
          )}
        </div>
      )}

      {error && step !== 'confirm' && <p className="pis-error" role="alert">{error}</p>}
    </div>
  )
}

export default PatientIdentityScreen
