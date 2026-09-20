import React, { useEffect, useState } from 'react'
import './AppointmentScreen.css'
import { useLanguage } from '../../i18n/LanguageContext'
import BilingualText from '../BilingualText/BilingualText'
import consultationService from '../../doctor/services/consultationService'
import patientService from '../../patient/services/patientService'
import { usePatientAuth } from '../../patient/context/PatientContext'
import PatientAccount from '../PatientAccount/PatientAccount'

const getUpcomingDates = () => {
  const dates = []
  const today = new Date()
  for (let i = 0; i < 3; i++) {
    const d = new Date()
    d.setDate(today.getDate() + i)
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
    const fullDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    dates.push({ label, fullDate })
  }
  return dates
}

const AppointmentScreen = ({ doctor, mode = 'instant', result, lang, onBack, onHome, onJoinVideoRoom }) => {
  const { en } = useLanguage()
  const { patient } = usePatientAuth()
  
  // consultation mode: 'instant' vs 'scheduled' (all 100% online video teleconsultations)
  const [consultMode, setConsultMode] = useState(mode === 'scheduled' ? 'scheduled' : 'instant')
  const availableDates = getUpcomingDates()
  const [selectedDate, setSelectedDate] = useState(availableDates[0].fullDate)
  const [selectedSlot, setSelectedSlot] = useState(doctor?.slots?.[0] || '10:00 AM')

  const [confirmed, setConfirmed] = useState(false)
  const [confirmedConsultId, setConfirmedConsultId] = useState(null)
  const [submitError, setSubmitError] = useState('')
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [phone, setPhone] = useState('')
  const [editingSavedDetails, setEditingSavedDetails] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const isInstant = consultMode === 'instant'

  useEffect(() => {
    if (!patient) return
    setName(patient.name || '')
    setAge(patient.age ? String(patient.age) : '')
    setGender(patient.gender || '')
    setPhone(patient.phone || '')
  }, [patient])

  const submitConsultation = async () => {
    if (!name.trim()) return
    if (!isInstant && !selectedSlot) return

    // Seamless Authentication Gate: if user not authenticated, open login modal
    if (!patientService.getToken()) {
      setShowAuthModal(true)
      return
    }

    setSubmitError('')
    setSubmitting(true)

    try {
      const severity = typeof result?.severity === 'object' ? result.severity.label : (result?.severity || 'Moderate')
      const patientSymptoms = result?.inputSymptoms || result?.matchedSymptoms?.join(', ') || 'Online Medical Consultation'

      // Flexible canonical doctor ID
      const doctorIdentifier = doctor._id || doctor.entry_id || doctor.id
      const resolvedSlot = isInstant ? 'Instant Video Call' : `${selectedDate} · ${selectedSlot}`

      const request = await consultationService.createRequest({
        doctorId: doctorIdentifier,
        doctorName: doctor.name,
        doctorSpecialty: doctor.specialty || doctor.spec,
        patientName: name.trim(),
        patientAge: age.trim(),
        patientGender: gender,
        patientLang: lang?.label || 'English',
        patientPhone: phone.trim(),
        patientContact: phone.trim(),
        patientSymptoms,
        symptoms: patientSymptoms,
        aiResult: result ? {
          predictedDisease: result.predictedDisease || null,
          possibleDiseases: (result.possibleDiseases || []).map(item => typeof item === 'string' ? item : item.disease).filter(Boolean),
          recommendedSpecialist: result.recommendedSpecialist || null,
          severity: severity || null,
          confidence: result.confidence || 0,
          emergencyFlag: result.emergencyFlag === true,
          urgencyNote: result.urgencyNote || '',
        } : null,
        slot: resolvedSlot,
        consultationType: 'video', // 100% online video teleconsultation
      })

      setConfirmedConsultId(request.id)
      setConfirmed(true)

      // If instant mode, auto-join immediately
      if (isInstant) {
        onJoinVideoRoom?.(request.id, name.trim())
      }
    } catch (error) {
      setSubmitError(error.message || 'Unable to book consultation. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAuthenticated = () => {
    setShowAuthModal(false)
    setTimeout(() => {
      submitConsultation()
    }, 100)
  }

  if (!doctor) return null

  return (
    <div className="appt-screen anim-in">
      {showAuthModal && (
        <PatientAccount
          initialMode="login"
          showVideoPrompt
          onClose={() => setShowAuthModal(false)}
          onAuthenticated={handleAuthenticated}
          onJoinVideoRoom={onJoinVideoRoom}
        />
      )}

      <div className="appt-topbar">
        <button id="appt-back-btn" className="appt-back-btn" onClick={onBack}>← Back</button>
        <span className="appt-topbar__title">Online Video Consultation</span>
      </div>

      <div className="appt-inner">
        {confirmed ? (
          <div className="appt-success anim-in" role="alert" aria-live="assertive">
            <div className="appt-success__icon" aria-hidden="true">✓</div>
            <h2 className="appt-success__title">
              <BilingualText tKey="booked" enText="Online Video Consultation Confirmed!" as="span" size="lg" />
            </h2>
            <div className="appt-success__card">
              <p><strong>Doctor:</strong> {doctor.name}</p>
              <p><strong>Specialization:</strong> {doctor.spec}</p>
              <p><strong>Hospital / Clinic:</strong> {doctor.hospital}</p>
              <p><strong>Mode:</strong> 🎥 100% Online Teleconsultation</p>
              <p><strong>Scheduled Slot:</strong> {isInstant ? '⚡ Instant (Doctor Alerted)' : `${selectedDate} · ${selectedSlot}`}</p>
              <p><strong>Patient:</strong> {name}{age && `, ${age} yrs`}{gender && `, ${gender}`}</p>
              {phone && <p><strong>Contact:</strong> {phone}</p>}
              <p><strong>Consultation Fee:</strong> {doctor.fee}</p>
              <div style={{ marginTop: '16px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#166534', fontSize: '0.9rem' }}>
                ✓ Secure HD video consultation room is ready for you and the doctor.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
              <button
                id="enter-video-room-btn"
                className="appt-confirm-btn"
                style={{ background: '#16a34a', border: 'none', padding: '12px 24px', fontSize: '1rem', cursor: 'pointer' }}
                onClick={() => onJoinVideoRoom?.(confirmedConsultId, name.trim())}
              >
                🎥 Enter Consultation Room Now
              </button>
              <button id="appt-home-btn" className="appt-home-btn" onClick={onHome}>
                🏠 <BilingualText tKey="backHome" as="span" size="sm" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Doctor summary card */}
            <div className="appt-doc-card">
              <div className="appt-doc-avatar" style={{ background: doctor.bgColor }}>{doctor.initials}</div>
              <div className="appt-doc-info">
                <h3>{doctor.name}</h3>
                <p>{doctor.spec} · {doctor.hospital}</p>
                <p className="appt-doc-fee">Consultation Fee: <strong>{doctor.fee}</strong></p>
              </div>
              <div className="appt-mode-badge appt-mode-badge--video">
                🎥 100% Online Telemedicine
              </div>
            </div>

            {/* Mode Switcher: Instant vs Scheduled */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '20px 0' }}>
              <button
                type="button"
                onClick={() => setConsultMode('instant')}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: isInstant ? '2px solid #1565c0' : '1px solid #cbd5e1',
                  background: isInstant ? '#eff6ff' : '#fff',
                  color: isInstant ? '#1565c0' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>⚡</span>
                <span>Instant Video Call</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.85 }}>Connect with doctor now</span>
              </button>

              <button
                type="button"
                onClick={() => setConsultMode('scheduled')}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: !isInstant ? '2px solid #1565c0' : '1px solid #cbd5e1',
                  background: !isInstant ? '#eff6ff' : '#fff',
                  color: !isInstant ? '#1565c0' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>📅</span>
                <span>Schedule for Later</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.85 }}>Pick preferred date & slot</span>
              </button>
            </div>

            {/* Slot & Date selection (shown for scheduled mode) */}
            {!isInstant && (
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                <label className="appt-label" style={{ marginBottom: '8px', display: 'block' }}>1. Choose Date</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {availableDates.map(d => (
                    <button
                      key={d.fullDate}
                      type="button"
                      onClick={() => setSelectedDate(d.fullDate)}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: selectedDate === d.fullDate ? '2px solid #1565c0' : '1px solid #cbd5e1',
                        background: selectedDate === d.fullDate ? '#1565c0' : '#fff',
                        color: selectedDate === d.fullDate ? '#fff' : '#1e293b',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      <div>{d.label}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>{d.fullDate}</div>
                    </button>
                  ))}
                </div>

                <label className="appt-label" style={{ marginBottom: '8px', display: 'block' }}>2. Choose Time Slot</label>
                <div className="appt-slots">
                  {(doctor.slots || ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '06:00 PM']).map(slot => (
                    <button
                      key={slot}
                      type="button"
                      className={`appt-slot ${selectedSlot === slot ? 'appt-slot--selected' : ''}`}
                      onClick={() => setSelectedSlot(slot)}
                      aria-pressed={selectedSlot === slot}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Patient profile details */}
            {patient && !editingSavedDetails ? (
              <div className="appt-saved-details">
                <h3>Your Verified Patient Profile</h3>
                <p><strong>Name:</strong> {patient.name}</p>
                <p><strong>Age:</strong> {patient.age || 'Not provided'}</p>
                <p><strong>Gender:</strong> {patient.gender || 'Not provided'}</p>
                <p><strong>Mobile:</strong> {patient.phone}</p>

                <div className="appt-saved-details__actions" style={{ marginTop: '18px' }}>
                  <button type="button" className="appt-edit-btn" onClick={() => setEditingSavedDetails(true)}>
                    Edit Details
                  </button>
                  <button
                    type="button"
                    className="appt-confirm-btn"
                    onClick={submitConsultation}
                    disabled={submitting || (!isInstant && !selectedSlot)}
                  >
                    {submitting ? 'Connecting with Doctor...' : `Confirm ${isInstant ? 'Instant Video Call' : 'Scheduled Consultation'}`}
                  </button>
                </div>
                {submitError && <p className="appt-error" role="alert" style={{ marginTop: '12px' }}>{submitError}</p>}
              </div>
            ) : (
              <form className="appt-form" onSubmit={event => { event.preventDefault(); submitConsultation() }} noValidate>
                <div className="appt-field">
                  <label htmlFor="appt-name" className="appt-label">Patient Name <span className="appt-required">*</span></label>
                  <input id="appt-name" className="appt-input" type="text" placeholder="Enter your full name" value={name} onChange={event => setName(event.target.value)} required />
                </div>
                <div className="appt-field-row">
                  <div className="appt-field">
                    <label htmlFor="appt-age" className="appt-label">Age</label>
                    <input id="appt-age" className="appt-input" type="number" min="1" max="120" placeholder="e.g. 45" value={age} onChange={event => setAge(event.target.value)} />
                  </div>
                  <div className="appt-field">
                    <label htmlFor="appt-gender" className="appt-label">Gender</label>
                    <select id="appt-gender" className="appt-input appt-select" value={gender} onChange={event => setGender(event.target.value)}>
                      <option value="">Select</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
                <div className="appt-field">
                  <label htmlFor="appt-phone" className="appt-label">Mobile Number <span className="appt-required">*</span></label>
                  <input id="appt-phone" className="appt-input" type="tel" placeholder="+91 XXXXX XXXXX" value={phone} onChange={event => setPhone(event.target.value)} required />
                </div>

                <div className="appt-avail-note">🎥 100% Online Telemedicine · Doctor is available for video consultation</div>
                <button
                  type="submit"
                  id="appt-confirm-btn"
                  className="appt-confirm-btn"
                  disabled={submitting || (!isInstant && !selectedSlot) || !name.trim()}
                >
                  {submitting ? 'Connecting with Doctor...' : `Confirm ${isInstant ? 'Instant Video Call' : 'Scheduled Consultation'}`}
                </button>
                {submitError && <p className="appt-error" role="alert">{submitError}</p>}
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default AppointmentScreen
