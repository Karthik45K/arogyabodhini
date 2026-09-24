import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useLanguage, LANGUAGES } from './i18n/LanguageContext'
import LanguageSelectScreen from './components/LanguageSelectScreen/LanguageSelectScreen'
import HomeScreen           from './components/HomeScreen/HomeScreen'
import ListeningScreen      from './components/ListeningScreen/ListeningScreen'
import AnalyzingScreen      from './components/AnalyzingScreen/AnalyzingScreen'
import WaitingForDoctorScreen from './components/WaitingForDoctorScreen/WaitingForDoctorScreen'
import ResultScreen         from './components/ResultScreen/ResultScreen'
import DoctorListScreen     from './components/DoctorListScreen/DoctorListScreen'
import DoctorDetailScreen   from './components/DoctorDetailScreen/DoctorDetailScreen'
import AppointmentScreen    from './components/AppointmentScreen/AppointmentScreen'
import PatientVideoRoom     from './components/PatientVideoRoom/PatientVideoRoom'
import AppHeader            from './components/AppHeader/AppHeader'
import EntryScreen          from './components/EntryScreen/EntryScreen'
import PatientIdentityScreen from './components/PatientIdentityScreen/PatientIdentityScreen'
import PatientAccount       from './components/PatientAccount/PatientAccount'
import { usePatientAuth }   from './patient/context/PatientContext'
import patientService from './patient/services/patientService'
import consultationService from './doctor/services/consultationService'
import IncomingCallModal from './components/IncomingCallModal/IncomingCallModal'
import MobileNav from './components/MobileNav/MobileNav'
import ServerWarmup from './components/ServerWarmup/ServerWarmup'
import { analyzeSymptoms as analyzeAPI } from './services/api'
import { formatDoctorDisplayName } from './services/doctorMatchService'
import { stopIncomingCallAlert } from './utils/callNotification'
import './styles/App.css'

const SCREENS = {
  HOME:              'home',
  LISTENING:         'listening',
  ANALYZING:         'analyzing',
  WAITING_DOCTOR:    'waiting_doctor',
  RESULT:            'result',
  DOCTORS:           'doctors',
  DOCTOR_DETAIL:     'doctor_detail',
  APPOINTMENT:       'appointment',
  PATIENT_VIDEO:     'patient_video',
}

const DOCTOR_SEARCH_POLL_MS = 4000

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

function clearVideoSession() {
  try { sessionStorage.removeItem(VIDEO_SESSION_KEY) } catch {}
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

function readPatientProfile() {
  try { return JSON.parse(localStorage.getItem('ab_patient_profile') || 'null') } catch { return null }
}

/* Inner app — runs inside LanguageProvider so it can call useLanguage */
function AppInner() {
  const { lang, setLang } = useLanguage()
  const { patient, loading: patientLoading } = usePatientAuth()

  // ALL hooks called unconditionally
  const [screen,          setScreen]          = useState(() => {
    const saved = loadVideoSession()
    return saved?.consultId ? SCREENS.PATIENT_VIDEO : SCREENS.HOME
  })
  const [activeLang,      setActiveLang]      = useState(null)
  const [result,          setResult]          = useState(null)
  const [apiError,        setApiError]        = useState(null)
  const [showLangPicker,  setShowLangPicker]  = useState(false)
  const [patientFlowReady, setPatientFlowReady] = useState(false)
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
  const [progressKey, setProgressKey] = useState('understandingSymptoms')
  const [matchPhase, setMatchPhase] = useState('searching') // searching | found | connecting | waiting_accept
  const [matchedDoctor, setMatchedDoctor] = useState(null)
  const transcriptRef = useRef('')
  const lastAlertedCallIdRef = useRef(null)
  const analysisLockRef = useRef(false)
  const consultCreatingRef = useRef(false)
  const pendingConnectRef = useRef(null)
  const doctorSearchSessionRef = useRef(0)
  const doctorPollRef = useRef(null)
  const matchInFlightRef = useRef(false)

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

  const stopDoctorSearch = useCallback(() => {
    doctorSearchSessionRef.current += 1
    matchInFlightRef.current = false
    if (doctorPollRef.current) {
      clearInterval(doctorPollRef.current)
      doctorPollRef.current = null
    }
  }, [])

  // Cleanup doctor-search polling on unmount
  useEffect(() => () => {
    if (doctorPollRef.current) {
      clearInterval(doctorPollRef.current)
      doctorPollRef.current = null
    }
    doctorSearchSessionRef.current += 1
  }, [])

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
          // Real assigned consultation only — never invent a doctor card
          const upcoming = consults.find(c =>
            (c.status === 'accepted' || c.status === 'waiting') &&
            c.doctorId &&
            c.doctorName &&
            isCallFresh(c)
          )
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
      stopDoctorSearch()
      analysisLockRef.current = false
      pendingConnectRef.current = null
      setMatchPhase('searching')
      setMatchedDoctor(null)
      setApiError(null)
      setScreen(SCREENS.HOME)
    } else if (tab === 'reports') {
      setAccountInitialView('documents')
      setShowPatientAuth(true)
    } else if (tab === 'prescriptions') {
      setAccountInitialView('prescriptions')
      setShowPatientAuth(true)
    } else if (tab === 'details') {
      setAccountInitialView('profile')
      setShowPatientAuth(true)
    }
  }, [stopDoctorSearch])

  // ── Language ──
  const handleChangeLang = useCallback((l) => {
    setLang(l)
    setActiveLang(l)
    setShowLangPicker(false)
    try { sessionStorage.setItem('ab_lang_session', l.code) } catch {}
  }, [setLang])

  // Returning authenticated patient: restore preferred language if local cache empty
  useEffect(() => {
    if (!patient?.preferredLanguage || lang) return
    const preferred = LANGUAGES.find((l) => l.code === patient.preferredLanguage)
    if (preferred) setLang(preferred)
  }, [patient, lang, setLang])

  // ── Voice ──
  const handleStartListening = useCallback((selectedLang) => {
    setActiveLang(selectedLang)
    transcriptRef.current = ''
    setResult(null); setApiError(null)
    analysisLockRef.current = false
    setScreen(SCREENS.LISTENING)
  }, [])

  const createConsultForDoctor = useCallback(async (doctor, analysisResult, text, currentLang) => {
    if (consultCreatingRef.current) return null
    consultCreatingRef.current = true
    try {
      if (!patientService.getToken()) {
        pendingConnectRef.current = { doctor, analysisResult, text, currentLang, mode: 'legacy' }
        setMatchPhase('connecting')
        setMatchedDoctor(doctor)
        setScreen(SCREENS.WAITING_DOCTOR)
        setShowPatientAuth(true)
        return null
      }

      const profile = patient || readPatientProfile()
      const patientName = profile?.name || 'Patient'
      const patientSymptoms = analysisResult?.inputSymptoms || text || 'Health consultation'
      const severity = typeof analysisResult?.severity === 'object'
        ? analysisResult.severity.label
        : (analysisResult?.severity || 'Moderate')

      setMatchPhase('connecting')
      setMatchedDoctor(doctor)
      setSelectedDoctor(doctor)
      setScreen(SCREENS.WAITING_DOCTOR)

      const request = await consultationService.createRequest({
        doctorId: doctor.entry_id || doctor.id || (doctor._id ? String(doctor._id) : null),
        doctorName: doctor.name,
        doctorSpecialty: doctor.specialty || doctor.spec || analysisResult?.recommendedSpecialist,
        patientName,
        patientAge: profile?.age ? String(profile.age) : '',
        patientGender: profile?.gender || '',
        patientLang: currentLang?.label || 'English',
        patientPhone: profile?.phone || '',
        patientContact: profile?.phone || '',
        patientSymptoms,
        symptoms: patientSymptoms,
        aiResult: analysisResult ? {
          predictedDisease: analysisResult.predictedDisease || null,
          possibleDiseases: (analysisResult.possibleDiseases || []).map(item => typeof item === 'string' ? item : item.disease).filter(Boolean),
          recommendedSpecialist: analysisResult.recommendedSpecialist || null,
          severity: severity || null,
          confidence: analysisResult.confidence || 0,
          emergencyFlag: analysisResult.emergencyFlag === true,
          urgencyNote: analysisResult.urgencyNote || '',
        } : null,
        slot: 'Instant Video Call',
        consultationType: 'video',
      }).catch((err) => {
        if (err?.status === 401) {
          pendingConnectRef.current = { doctor, analysisResult, text, currentLang, mode: 'legacy' }
          setShowPatientAuth(true)
          return null
        }
        throw err
      })

      if (!request) return null

      setVideoConsultId(request.id)
      setVideoPatientName(patientName)
      setMatchPhase('waiting_accept')
      return request
    } finally {
      consultCreatingRef.current = false
    }
  }, [patient])

  const startDoctorSearch = useCallback((analysisResult, text, currentLang) => {
    stopDoctorSearch()
    const sessionId = doctorSearchSessionRef.current
    const specialty = analysisResult?.recommendedSpecialist || analysisResult?.specialtyCanonical
    if (!specialty) return

    const isSearchActive = () => sessionId === doctorSearchSessionRef.current

    setMatchPhase('searching')
    setMatchedDoctor(null)
    setScreen(SCREENS.WAITING_DOCTOR)

    const tick = async () => {
      if (!isSearchActive()) return
      if (matchInFlightRef.current || consultCreatingRef.current) return
      matchInFlightRef.current = true
      try {
        if (!patientService.getToken()) {
          pendingConnectRef.current = { analysisResult, text, currentLang, mode: 'match' }
          if (doctorPollRef.current) {
            clearInterval(doctorPollRef.current)
            doctorPollRef.current = null
          }
          setShowPatientAuth(true)
          return
        }

        const profile = patient || readPatientProfile()
        const patientSymptoms = analysisResult?.inputSymptoms || text || 'Health consultation'
        const severity = typeof analysisResult?.severity === 'object'
          ? analysisResult.severity.label
          : (analysisResult?.severity || 'Moderate')

        const match = await consultationService.matchRequest({
          specialty,
          patientAge: profile?.age ? String(profile.age) : '',
          patientGender: profile?.gender || '',
          patientLang: currentLang?.label || 'English',
          patientSymptoms,
          symptoms: patientSymptoms,
          aiResult: {
            predictedDisease: analysisResult.predictedDisease || null,
            possibleDiseases: (analysisResult.possibleDiseases || [])
              .map((item) => (typeof item === 'string' ? item : item.disease))
              .filter(Boolean),
            recommendedSpecialist: analysisResult.recommendedSpecialist || specialty,
            severity: severity || null,
            confidence: analysisResult.confidence || 0,
            emergencyFlag: analysisResult.emergencyFlag === true,
            urgencyNote: analysisResult.urgencyNote || '',
          },
          slot: 'Instant Video Call',
          consultationType: 'video',
        })

        if (!isSearchActive()) return

        if (!match?.matched) {
          // Keep recommended specialty; automatically retry — do not switch specialty
          setMatchPhase('searching')
          setMatchedDoctor(null)
          return
        }

        if (doctorPollRef.current) {
          clearInterval(doctorPollRef.current)
          doctorPollRef.current = null
        }

        const doctor = match.doctor || {
          id: match.consultation?.doctorId,
          name: match.consultation?.doctorName,
          specialty: match.specialtyLabel || specialty,
        }

        setMatchedDoctor(doctor)
        setSelectedDoctor(doctor)
        setMatchPhase('found')
        await new Promise((r) => setTimeout(r, 400))
        if (!isSearchActive()) return

        setVideoConsultId(match.consultation.id)
        setVideoPatientName(match.consultation.patientName || profile?.name || 'Patient')
        setMatchPhase('waiting_accept')
        doctorSearchSessionRef.current += 1
      } catch (err) {
        if (!isSearchActive()) return
        if (err?.status === 401) {
          pendingConnectRef.current = { analysisResult, text, currentLang, mode: 'match' }
          if (doctorPollRef.current) {
            clearInterval(doctorPollRef.current)
            doctorPollRef.current = null
          }
          setShowPatientAuth(true)
          return
        }
        console.warn('[doctor-match] search tick failed:', err.message)
      } finally {
        matchInFlightRef.current = false
      }
    }

    tick()
    doctorPollRef.current = setInterval(tick, DOCTOR_SEARCH_POLL_MS)
  }, [stopDoctorSearch, patient])

  const runAnalysisAndConnect = useCallback(async (text, selectedLang) => {
    const trimmed = String(text || '').trim()
    if (!trimmed) {
      setApiError('couldNotHear')
      setScreen(SCREENS.HOME)
      analysisLockRef.current = false
      return
    }
    if (analysisLockRef.current) return
    analysisLockRef.current = true

    const currentLang = selectedLang || activeLang || lang
    setActiveLang(currentLang)
    setApiError(null)
    setResult(null)
    setMatchedDoctor(null)
    setMatchPhase('searching')
    transcriptRef.current = trimmed
    setRetryText(trimmed)
    setProgressKey('understandingSymptoms')
    setScreen(SCREENS.ANALYZING)
    stopDoctorSearch()

    try {
      const data = await analyzeAPI(trimmed, currentLang?.code || 'en')
      const analysisResult = { ...data, inputSymptoms: trimmed }
      setResult(analysisResult)

      if (!analysisResult.recommendedSpecialist) {
        setApiError('Unable to determine a specialist. Please try again.')
        setScreen(SCREENS.HOME)
        return
      }

      startDoctorSearch(analysisResult, trimmed, currentLang)
    } catch (err) {
      setApiError(err.message || 'Unable to reach the server.')
      setScreen(SCREENS.HOME)
    } finally {
      analysisLockRef.current = false
    }
  }, [activeLang, lang, startDoctorSearch, stopDoctorSearch])

  // ── Text submit ──
  const handleTextSubmit = useCallback(async (text, selectedLang) => {
    await runAnalysisAndConnect(text, selectedLang)
  }, [runAnalysisAndConnect])

  // ── Listening done ──
  const handleListeningDone = useCallback(async (transcript) => {
    await runAnalysisAndConnect(transcript, activeLang || lang)
  }, [runAnalysisAndConnect, activeLang, lang])

  // ── Cancel match / home from waiting screen ──
  const handleCancelMatchAndGoHome = useCallback(() => {
    stopDoctorSearch()
    analysisLockRef.current = false
    pendingConnectRef.current = null
    setMatchPhase('searching')
    setMatchedDoctor(null)
    setApiError(null)
    setRetryText('')
    setCurrentTab('home')
    // If a consultation was already created, keep it (videoConsultId / selectedDoctor).
    // Do not delete the consultation; just leave the waiting UI.
    setScreen(SCREENS.HOME)
  }, [stopDoctorSearch])

  // ── Full reset to home (clears pending video session) ──
  const handleReset = useCallback(() => {
    stopDoctorSearch()
    clearVideoSession()
    analysisLockRef.current = false
    pendingConnectRef.current = null
    transcriptRef.current = ''
    setResult(null)
    setApiError(null)
    setSelectedDoctor(null)
    setMatchedDoctor(null)
    setMatchPhase('searching')
    setVideoConsultId(null)
    setVideoPatientName('')
    setRetryText('')
    setCurrentTab('home')
    setScreen(SCREENS.HOME)
  }, [stopDoctorSearch])

  const handleLeaveVideoRoom = useCallback(() => {
    clearVideoSession()
    setVideoConsultId(null)
    setVideoPatientName('')
    setScreen(SCREENS.APPOINTMENT)
  }, [])

  const handleVideoHome = useCallback(() => {
    stopDoctorSearch()
    clearVideoSession()
    setVideoConsultId(null)
    setVideoPatientName('')
    transcriptRef.current = ''
    setResult(null); setApiError(null)
    setSelectedDoctor(null)
    setMatchedDoctor(null)
    setMatchPhase('searching')
    setScreen(SCREENS.HOME)
  }, [stopDoctorSearch])

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
    const pending = pendingConnectRef.current
    if (pending) {
      pendingConnectRef.current = null
      if (pending.mode === 'match' || !pending.doctor) {
        startDoctorSearch(pending.analysisResult, pending.text, pending.currentLang)
        return
      }
      setMatchPhase('connecting')
      setMatchedDoctor(pending.doctor)
      setScreen(SCREENS.WAITING_DOCTOR)
      createConsultForDoctor(pending.doctor, pending.analysisResult, pending.text, pending.currentLang)
        .catch((err) => {
          setApiError(err.message || 'Unable to reach the server.')
          setScreen(SCREENS.HOME)
        })
      return
    }
    if (selectedDoctor) {
      setScreen(SCREENS.APPOINTMENT)
    }
  }, [selectedDoctor, createConsultForDoctor, startDoctorSearch])

  // Must be declared before any early returns (Rules of Hooks).
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

  const currentLang = activeLang || lang

  if (patientLoading) {
    return (
      <div className="ab-app">
        <p style={{ textAlign: 'center', marginTop: '40vh', fontSize: '1.2rem', fontWeight: 700 }}>Please wait</p>
      </div>
    )
  }

  // 1) Language selection first (no patient login on this screen)
  if (!patientFlowReady) {
    return (
      <div className="ab-app">
        <EntryScreen
          onSelectLang={(l) => {
            handleChangeLang(l)
            setPatientFlowReady(true)
          }}
        />
      </div>
    )
  }

  // 2) Patient page: valid JWT → home; otherwise Patient Login (localized)
  if (!patient) {
    return (
      <div className="ab-app">
        <PatientIdentityScreen onDone={() => setShowPatientAuth(false)} />
      </div>
    )
  }

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
                Dr. {formatDoctorDisplayName(activeIncomingCall.doctorName)} is ready for your video consultation!
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
            onJoinVideoRoom={handleJoinActiveCall}
          />
        )}

        {screen === SCREENS.LISTENING && (
          <ListeningScreen lang={currentLang} onDone={handleListeningDone} onCancel={handleReset} />
        )}

        {screen === SCREENS.ANALYZING && (
          <AnalyzingScreen
            messageKey={progressKey}
            onHome={handleCancelMatchAndGoHome}
          />
        )}

        {screen === SCREENS.WAITING_DOCTOR && result && (
          <WaitingForDoctorScreen
            result={result}
            phase={matchPhase}
            doctor={matchedDoctor || selectedDoctor}
            onHome={handleCancelMatchAndGoHome}
          />
        )}

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
