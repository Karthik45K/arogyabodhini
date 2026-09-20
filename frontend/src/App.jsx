import React, { useState, useRef, useCallback, useEffect } from 'react'
import { LanguageProvider, useLanguage } from './i18n/LanguageContext'
import LanguageSelectScreen from './components/LanguageSelectScreen/LanguageSelectScreen'
import HomeScreen           from './components/HomeScreen/HomeScreen'
import ListeningScreen      from './components/ListeningScreen/ListeningScreen'
import AnalyzingScreen      from './components/AnalyzingScreen/AnalyzingScreen'
import ResultScreen         from './components/ResultScreen/ResultScreen'
import DoctorListScreen     from './components/DoctorListScreen/DoctorListScreen'
import DoctorDetailScreen   from './components/DoctorDetailScreen/DoctorDetailScreen'
import AppointmentScreen    from './components/AppointmentScreen/AppointmentScreen'
import PatientVideoRoom     from './components/PatientVideoRoom/PatientVideoRoom'
import AppHeader            from './components/AppHeader/AppHeader'
import PatientAccount       from './components/PatientAccount/PatientAccount'
import { usePatientAuth }   from './patient/context/PatientContext'
import { PatientProvider } from './patient/context/PatientContext'
import patientService from './patient/services/patientService'
import consultationService from './doctor/services/consultationService'
import IncomingCallModal from './components/IncomingCallModal/IncomingCallModal'
import MobileNav from './components/MobileNav/MobileNav'
import ServerWarmup from './components/ServerWarmup/ServerWarmup'
import { analyzeSymptoms as analyzeAPI } from './services/api'
import { stopIncomingCallAlert } from './utils/callNotification'
import './styles/App.css'

const SCREENS = {
  HOME:              'home',
  LISTENING:         'listening',
  ANALYZING:         'analyzing',
  RESULT:            'result',
  DOCTORS:           'doctors',
  DOCTOR_DETAIL:     'doctor_detail',
  APPOINTMENT:       'appointment',
  PATIENT_VIDEO:     'patient_video',
}

const VIDEO_SESSION_KEY = 'ab_active_video_session'
const DISMISSED_CALLS_KEY = 'ab_dismissed_calls'

function loadVideoSession() {
  try {
    const raw = sessionStorage.getItem(VIDEO_SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveVideoSession(consultId, patientName) {
  try {
    sessionStorage.setItem(VIDEO_SESSION_KEY, JSON.stringify({ consultId, patientName }))
  } catch {}
}

function getDismissedCallIds() {
  try {
    const raw = sessionStorage.getItem(DISMISSED_CALLS_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function addDismissedCallId(id) {
  try {
    const set = getDismissedCallIds()
    set.add(id)
    sessionStorage.setItem(DISMISSED_CALLS_KEY, JSON.stringify([...set]))
  } catch {}
}

function isCallFresh(c) {
  if (!c) return false
  const t = new Date(c.updatedAt || c.createdAt || 0).getTime()
  if (!t || isNaN(t)) return true
  // Within last 45 minutes
  return (Date.now() - t) < 45 * 60 * 1000
}

function clearVideoSession() {
  try { sessionStorage.removeItem(VIDEO_SESSION_KEY) } catch {}
}

/* Inner app — runs inside LanguageProvider so it can call useLanguage */
function AppInner() {
  const { lang, setLang } = useLanguage()
  const { patient } = usePatientAuth()

  // ALL hooks called unconditionally
  const [screen,          setScreen]          = useState(() => {
    const saved = loadVideoSession()
    return saved?.consultId ? SCREENS.PATIENT_VIDEO : SCREENS.HOME
  })
  const [activeLang,      setActiveLang]      = useState(null)
  const [result,          setResult]          = useState(null)
  const [apiError,        setApiError]        = useState(null)
  const [showLangPicker,  setShowLangPicker]  = useState(false)
  const [showPatientAuth, setShowPatientAuth] = useState(false)
  const [selectedDoctor,  setSelectedDoctor]  = useState(null)
  const [appointmentMode, setAppointmentMode] = useState('instant') // 'instant' | 'scheduled'
  const [retryText,       setRetryText]       = useState('')
  const [videoConsultId,  setVideoConsultId]  = useState(() => loadVideoSession()?.consultId || null)
  const [videoPatientName,setVideoPatientName]= useState(() => loadVideoSession()?.patientName || '')
  const [activeIncomingCall, setActiveIncomingCall] = useState(null)
  const [showIncomingModal, setShowIncomingModal] = useState(false)
  const [upcomingConsultation, setUpcomingConsultation] = useState(null)
  const [accountInitialView, setAccountInitialView] = useState('profile')
  const [currentTab, setCurrentTab] = useState('home')
  const transcriptRef = useRef('')
  const lastAlertedCallIdRef = useRef(null)

  // Keep patient on video screen across remounts / refresh during active consultation
  useEffect(() => {
    if (screen === SCREENS.PATIENT_VIDEO && videoConsultId) {
      saveVideoSession(videoConsultId, videoPatientName)
    }
  }, [screen, videoConsultId, videoPatientName])

  // Silence any ringing immediately whenever user enters video room
  useEffect(() => {
    if (screen === SCREENS.PATIENT_VIDEO) {
      setShowIncomingModal(false)
      stopIncomingCallAlert()
    }
  }, [screen])

  const handleDismissCall = useCallback((callId) => {
    if (callId) {
      addDismissedCallId(callId)
    }
    stopIncomingCallAlert()
    setShowIncomingModal(false)
    setActiveIncomingCall(null)
  }, [])

  // Background poller to detect if a doctor has accepted or initiated a consultation
  useEffect(() => {
    let cancelled = false
    const checkActiveCalls = async () => {
      try {
        const dismissed = getDismissedCallIds()
        if (patient) {
          const res = await patientService.consultations()
          const consults = res.consultations || []
          const readyCall = consults.find(c => c.status === 'accepted' && isCallFresh(c))
          const upcoming = consults.find(c => c.status === 'waiting' && c.slot)
          if (!cancelled) {
            if (readyCall && !dismissed.has(readyCall.id)) {
              if (lastAlertedCallIdRef.current !== readyCall.id && screen !== SCREENS.PATIENT_VIDEO) {
                lastAlertedCallIdRef.current = readyCall.id
                setShowIncomingModal(true)
              }
              setActiveIncomingCall(readyCall)
            } else {
              setActiveIncomingCall(null)
              setShowIncomingModal(false)
            }
            setUpcomingConsultation(upcoming || null)
          }
        } else if (videoConsultId) {
          const consult = await consultationService.getById(videoConsultId, 'patient').catch(() => null)
          if (!cancelled && consult?.status === 'accepted' && isCallFresh(consult) && !dismissed.has(consult.id)) {
            if (lastAlertedCallIdRef.current !== consult.id && screen !== SCREENS.PATIENT_VIDEO) {
              lastAlertedCallIdRef.current = consult.id
              setShowIncomingModal(true)
            }
            setActiveIncomingCall(consult)
          } else if (!cancelled) {
            setActiveIncomingCall(null)
            setShowIncomingModal(false)
          }
        }
      } catch {}
    }

    const intervalId = setInterval(checkActiveCalls, 4000)
    checkActiveCalls()
    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [patient, videoConsultId, screen])

  const handleMobileNavChange = useCallback((tab) => {
    setCurrentTab(tab)
    if (tab === 'home') {
      setScreen(SCREENS.HOME)
    } else if (tab === 'consultations') {
      setAccountInitialView('consultations')
      setShowPatientAuth(true)
    } else if (tab === 'records') {
      setAccountInitialView('documents')
      setShowPatientAuth(true)
    } else if (tab === 'language') {
      setShowLangPicker(true)
    }
  }, [])

  // ── Language ──
  const handleChangeLang = useCallback((l) => {
    setLang(l)
    setActiveLang(l)
    setShowLangPicker(false)
  }, [setLang])

  // ── Voice ──
  const handleStartListening = useCallback((selectedLang) => {
    setActiveLang(selectedLang)
    transcriptRef.current = ''
    setResult(null); setApiError(null)
    setScreen(SCREENS.LISTENING)
  }, [])

  // ── Text submit ──
  const handleTextSubmit = useCallback(async (text, selectedLang) => {
    setActiveLang(selectedLang)
    setApiError(null); setResult(null)
    transcriptRef.current = text
    setRetryText(text)
    setScreen(SCREENS.ANALYZING)
    try {
      const data = await analyzeAPI(text, selectedLang.code)
      setResult({ ...data, inputSymptoms: text }); setScreen(SCREENS.RESULT)
    } catch (err) {
      setApiError(err.message || 'Unable to reach the server.')
      setScreen(SCREENS.HOME)
    }
  }, [])

  // ── Listening done ──
  const handleListeningDone = useCallback(async (transcript) => {
    transcriptRef.current = transcript
    setRetryText(transcript)
    setScreen(SCREENS.ANALYZING)
    const currentLang = activeLang || lang
    try {
      const data = await analyzeAPI(transcript, currentLang.code)
      setResult({ ...data, inputSymptoms: transcript }); setScreen(SCREENS.RESULT)
    } catch (err) {
      setApiError(err.message || 'Unable to reach the server.')
      setScreen(SCREENS.HOME)
    }
  }, [activeLang, lang])

  // ── Reset to home ──
  const handleReset = useCallback(() => {
    clearVideoSession()
    transcriptRef.current = ''
    setResult(null); setApiError(null)
    setSelectedDoctor(null)
    setVideoConsultId(null)
    setVideoPatientName('')
    setRetryText('')
    setScreen(SCREENS.HOME)
  }, [])

  const handleLeaveVideoRoom = useCallback(() => {
    clearVideoSession()
    setVideoConsultId(null)
    setVideoPatientName('')
    setScreen(SCREENS.APPOINTMENT)
  }, [])

  const handleVideoHome = useCallback(() => {
    clearVideoSession()
    setVideoConsultId(null)
    setVideoPatientName('')
    transcriptRef.current = ''
    setResult(null); setApiError(null)
    setSelectedDoctor(null)
    setScreen(SCREENS.HOME)
  }, [])

  // ── Doctor navigation ──
  const handleViewDoctor = useCallback((doctor) => {
    setSelectedDoctor(doctor)
    setScreen(SCREENS.DOCTOR_DETAIL)
  }, [])

  const handleBookAppointment = useCallback((doctor) => {
    setSelectedDoctor(doctor)
    setAppointmentMode('scheduled')
    setScreen(SCREENS.APPOINTMENT)
  }, [])

  const handleVideoConsult = useCallback((doctor) => {
    setSelectedDoctor(doctor)
    setAppointmentMode('instant')
    setScreen(SCREENS.APPOINTMENT)
  }, [])

  const handlePatientAuthenticated = useCallback(() => {
    setShowPatientAuth(false)
    if (selectedDoctor) {
      setScreen(SCREENS.APPOINTMENT)
    }
  }, [selectedDoctor])

  // ── No language saved yet → show picker ──
  if (!lang) {
    return (
      <div className="ab-app">
        <LanguageSelectScreen onSelect={handleChangeLang} />
      </div>
    )
  }

  const currentLang = activeLang || lang

  const handleJoinActiveCall = useCallback((call) => {
    stopIncomingCallAlert()
    setShowIncomingModal(false)
    const pName = patient?.name || call?.patientName || 'Patient'
    setVideoConsultId(call.id)
    setVideoPatientName(pName)
    saveVideoSession(call.id, pName)
    setActiveIncomingCall(null)
    setScreen(SCREENS.PATIENT_VIDEO)
  }, [patient])

  return (
    <div className="ab-app">
      {showLangPicker && <LanguageSelectScreen onSelect={handleChangeLang} />}

      <AppHeader
        onChangeLang={() => setShowLangPicker(true)}
        onJoinVideoRoom={handleJoinActiveCall}
        activeIncomingCall={activeIncomingCall}
        onOpenAccount={() => { setAccountInitialView('profile'); setShowPatientAuth(true); }}
      />

      <ServerWarmup />

      {/* Active Call Alert Banner (Visible anywhere in the app when doctor accepts) */}
      {activeIncomingCall && screen !== SCREENS.PATIENT_VIDEO && (
        <div
          style={{
            background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
            color: 'white',
            padding: '14px 24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            zIndex: 9999,
            position: 'sticky',
            top: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem', animation: 'bounce 1s infinite' }}>🔔</span>
            <div>
              <strong style={{ fontSize: '1.05rem', display: 'block' }}>
                Dr. {activeIncomingCall.doctorName} is ready for your video consultation!
              </strong>
              <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                The doctor has initiated the consultation. Click below to enter the secure room.
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              id="join-active-call-banner-btn"
              onClick={() => handleJoinActiveCall(activeIncomingCall)}
              style={{
                background: '#ffffff',
                color: '#15803d',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.15)'
              }}
            >
              🎥 Join Video Call Now
            </button>
            <button
              id="dismiss-active-call-banner-btn"
              type="button"
              onClick={() => handleDismissCall(activeIncomingCall.id)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.4)',
                padding: '9px 14px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
              title="Dismiss notification"
            >
              ✕ Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Ringing Incoming Video Call Modal */}
      {showIncomingModal && activeIncomingCall && screen !== SCREENS.PATIENT_VIDEO && (
        <IncomingCallModal
          call={activeIncomingCall}
          onAccept={handleJoinActiveCall}
          onDismiss={() => handleDismissCall(activeIncomingCall.id)}
        />
      )}

      {showPatientAuth && (
        <PatientAccount
          initialMode="login"
          initialView={accountInitialView}
          showVideoPrompt
          onClose={() => setShowPatientAuth(false)}
          onAuthenticated={handlePatientAuthenticated}
          onJoinVideoRoom={handleJoinActiveCall}
        />
      )}

      <main className="ab-main">
        {screen === SCREENS.HOME && (
          <HomeScreen
            apiError={apiError}
            initialText={retryText}
            upcomingConsultation={upcomingConsultation}
            onStartListening={handleStartListening}
            onTextSubmit={handleTextSubmit}
            onOpenAccount={() => { setAccountInitialView('consultations'); setShowPatientAuth(true); }}
            onJoinVideoRoom={handleJoinActiveCall}
          />
        )}

        {screen === SCREENS.LISTENING && (
          <ListeningScreen lang={currentLang} onDone={handleListeningDone} onCancel={handleReset} />
        )}

        {screen === SCREENS.ANALYZING && <AnalyzingScreen />}

        {screen === SCREENS.RESULT && result && (
          <ResultScreen
            result={result}
            lang={currentLang}
            onSpeakAgain={handleReset}
            onTryAgain={() => setScreen(SCREENS.HOME)}
            onFindDoctors={() => setScreen(SCREENS.DOCTORS)}
          />
        )}

        {screen === SCREENS.DOCTORS && result && (
          <DoctorListScreen
            result={result}
            lang={currentLang}
            onBack={() => setScreen(SCREENS.RESULT)}
            onHome={handleReset}
            onViewDoctor={handleViewDoctor}
            onBookDoctor={(doc, mode) => {
              setSelectedDoctor(doc)
              setAppointmentMode(mode || 'instant')
              setScreen(SCREENS.APPOINTMENT)
            }}
          />
        )}

        {screen === SCREENS.DOCTOR_DETAIL && selectedDoctor && (
          <DoctorDetailScreen
            doctor={selectedDoctor}
            lang={currentLang}
            onBack={() => setScreen(SCREENS.DOCTORS)}
            onBookAppointment={handleBookAppointment}
            onVideoConsult={handleVideoConsult}
          />
        )}

        {screen === SCREENS.APPOINTMENT && selectedDoctor && (
          <AppointmentScreen
            doctor={selectedDoctor}
            mode={appointmentMode}
            result={result}
            lang={currentLang}
            onBack={() => setScreen(SCREENS.DOCTOR_DETAIL)}
            onHome={handleReset}
            onJoinVideoRoom={(consultId, patientName) => {
              setVideoConsultId(consultId)
              setVideoPatientName(patientName)
              saveVideoSession(consultId, patientName)
              setActiveIncomingCall(null)
              setScreen(SCREENS.PATIENT_VIDEO)
            }}
          />
        )}

        {screen === SCREENS.PATIENT_VIDEO && videoConsultId && (
          <PatientVideoRoom
            consultationId={videoConsultId}
            patientName={videoPatientName}
            onBack={handleLeaveVideoRoom}
            onHome={handleVideoHome}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation (Always accessible at fingertips) */}
      <MobileNav
        currentTab={currentTab}
        onTabChange={handleMobileNavChange}
        activeCallCount={activeIncomingCall ? 1 : upcomingConsultation ? 1 : 0}
      />
    </div>
  )
}

export default AppInner
