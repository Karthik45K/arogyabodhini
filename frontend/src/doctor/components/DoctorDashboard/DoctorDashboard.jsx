import React, { useState, useEffect, useCallback } from 'react'
import './DoctorDashboard.css'
import { useDoctorAuth } from '../../context/DoctorContext'
import consultationService from '../../services/consultationService'

const NAV = [
  { id: 'waiting',    label: 'Consultation Requests', icon: '🔔' },
  { id: 'accepted',   label: 'Active Consultations',  icon: '🎥' },
  { id: 'upcoming',   label: 'Scheduled Online',      icon: '📅' },
  { id: 'completed',  label: 'Completed',              icon: '✅' },
  { id: 'profile',    label: 'My Profile',             icon: '👨‍⚕️' },
]

const SEV_COLOR = { High: '#c62828', Moderate: '#e65100', Low: '#2e7d32' }

const DoctorDashboard = ({ onOpenConsultation }) => {
  const { doctor, logout, setActiveStatus } = useDoctorAuth()
  const [tab,           setTab]           = useState(() => {
    return sessionStorage.getItem('ab_doctor_tab') || 'waiting'
  })
  const [consultations, setConsultations] = useState([])
  const [statusSaving,   setStatusSaving] = useState(false)
  const [pollingError,  setPollingError]  = useState('')

  const refresh = useCallback(async () => {
    if (!doctor) return
    try {
      const all = await consultationService.getByDoctor(doctor.id)
      all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setConsultations(all)
      setPollingError('')
    } catch (error) {
      console.error('[doctor/consultations] Poll failed:', error)
      if (error.status === 401) {
        setPollingError('Your doctor session has expired. Please sign in again.')
        logout()
      } else {
        setPollingError(error.message || 'Unable to load consultation requests.')
      }
    }
  }, [doctor, logout])

  useEffect(() => {
    if (!doctor) return
    // Poll every 3 seconds to pick up new patient requests quickly
    const id = setInterval(refresh, 3000)
    refresh()
    return () => clearInterval(id)
  }, [refresh, doctor])

  const handleClearDemo = async () => {
    refresh()
  }

  const handleAccept = async (id) => {
    const updated = await consultationService.accept(id)
    await refresh()
    if (updated) onOpenConsultation(updated)
  }

  const handleReject = async (id) => {
    await consultationService.reject(id)
    await refresh()
  }

  const handleStatusToggle = async () => {
    setStatusSaving(true)
    try {
      await setActiveStatus(!doctor.isActive)
    } finally {
      setStatusSaving(false)
    }
  }

  const filtered = consultations.filter(c => {
    if (tab === 'waiting')   return c.status === 'waiting'
    if (tab === 'accepted')  return c.status === 'accepted'
    if (tab === 'completed') return c.status === 'completed'
    if (tab === 'upcoming')  return Boolean(c.slot && c.slot !== 'Instant Video Call' && c.status !== 'completed' && c.status !== 'rejected')
    return false
  })

  const counts = {
    waiting:   consultations.filter(c => c.status === 'waiting').length,
    accepted:  consultations.filter(c => c.status === 'accepted').length,
    upcoming:  consultations.filter(c => c.slot && c.slot !== 'Instant Video Call' && c.status !== 'completed' && c.status !== 'rejected').length,
    completed: consultations.filter(c => c.status === 'completed').length,
  }

  const fullDoc = doctor || {}

  return (
    <div className="dash-root">

      {/* ── Sidebar ── */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar__brand">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <rect width="40" height="40" rx="8" fill="#1565c0"/>
            <rect x="17" y="6" width="6" height="28" rx="2" fill="white"/>
            <rect x="6"  y="17" width="28" height="6" rx="2" fill="white"/>
          </svg>
          <span>Arogyabodhini</span>
        </div>

        <div className="dash-sidebar__doctor">
          <div className="dash-sidebar__avatar" style={{ background: doctor?.bgColor || '#1565c0' }}>
            {doctor?.initials}
          </div>
          <div>
            <p className="dash-sidebar__name">{doctor?.name}</p>
            <p className="dash-sidebar__spec">{doctor?.spec}</p>
          </div>
        </div>

        <button
          id="doctor-status-toggle"
          className={`dash-status-toggle ${doctor?.isActive ? 'dash-status-toggle--active' : ''}`}
          onClick={handleStatusToggle}
          disabled={statusSaving}
          aria-pressed={doctor?.isActive === true}
        >
          <span className="dash-status-toggle__dot" aria-hidden="true" />
          {statusSaving ? 'Updating...' : doctor?.isActive ? 'Active - Accepting Video Requests' : 'Inactive - Go Active'}
        </button>

        <nav className="dash-nav">
          {NAV.map(n => {
            const count = counts[n.id] || 0
            return (
              <button
                key={n.id}
                id={`nav-${n.id}`}
                className={`dash-nav__item ${tab === n.id ? 'dash-nav__item--active' : ''}`}
                onClick={() => {
                  setTab(n.id)
                  sessionStorage.setItem('ab_doctor_tab', n.id)
                }}
              >
                <span className="dash-nav__icon">{n.icon}</span>
                <span>{n.label}</span>
                {count > 0 && (
                  <span className="dash-nav__badge">{count}</span>
                )}
              </button>
            )
          })}
        </nav>

        <button id="dr-logout-btn" className="dash-logout-btn" onClick={logout}>
          ⎋ Sign Out
        </button>
      </aside>

      {/* ── Main content ── */}
      <main className="dash-main">

        {/* Stats header */}
        <div className="dash-stats">
          <div className="dash-stat-card">
            <span className="dash-stat-val">{counts.waiting}</span>
            <span className="dash-stat-label">Waiting</span>
          </div>
          <div className="dash-stat-card dash-stat-card--active">
            <span className="dash-stat-val">{counts.accepted}</span>
            <span className="dash-stat-label">Active</span>
          </div>
          <div className="dash-stat-card dash-stat-card--done">
            <span className="dash-stat-val">{counts.completed}</span>
            <span className="dash-stat-label">Completed Today</span>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-val">{fullDoc?.rating || '–'}</span>
            <span className="dash-stat-label">Rating</span>
          </div>
        </div>

        {/* Section title + Clear Demo button */}
        <div className="dash-section-header">
          <h2 className="dash-section-title">
            {NAV.find(n => n.id === tab)?.label}
          </h2>
          {tab === 'waiting' && consultations.some(c => c._isDemo) && (
            <button
              id="dash-clear-demo-btn"
              className="dash-clear-demo-btn"
              onClick={handleClearDemo}
              title="Remove demo/sample data to see only real patient requests"
            >
              🧹 Clear Demo Data
            </button>
          )}
        </div>
        {pollingError && <p className="dash-empty" role="alert">{pollingError}</p>}

        {/* Profile tab */}
        {tab === 'profile' && fullDoc && (
          <div className="dash-profile-card">
            <div className="dash-profile-header">
              <div className="dash-profile-avatar" style={{ background: fullDoc.bgColor }}>
                {fullDoc.initials}
              </div>
              <div>
                <h3>{fullDoc.name}</h3>
                <p className="dash-profile-spec">{fullDoc.spec}</p>
                <p className="dash-profile-hosp">🏥 {fullDoc.hospital}</p>
                <p className="dash-profile-reg">Reg No: <strong>{doctor?.regNo}</strong></p>
              </div>
            </div>
            <div className="dash-profile-grid">
              <div><label>Experience</label><span>{fullDoc.exp}</span></div>
              <div><label>Rating</label><span>⭐ {fullDoc.rating} ({fullDoc.reviews} reviews)</span></div>
              <div><label>Consultation Fee</label><span>{fullDoc.fee}</span></div>
              <div><label>Mode</label><span>{fullDoc.online ? '🟢 Online available' : '🏥 In-person only'}</span></div>
              <div><label>Languages</label><span>{fullDoc.langs.join(', ')}</span></div>
              <div><label>Phone</label><span>{fullDoc.phone}</span></div>
            </div>
            <div>
              <label className="dash-profile-label">About</label>
              <p className="dash-profile-about">{fullDoc.about}</p>
            </div>
          </div>
        )}

        {/* Consultation cards */}
        {tab !== 'profile' && (
          <>
            {filtered.length === 0 && (
              <div className="dash-empty">
                <p>No {NAV.find(n => n.id === tab)?.label.toLowerCase()} at the moment.</p>
              </div>
            )}

            <div className="dash-cards">
              {filtered.map(c => (
                <div
                  key={c.id}
                  className={`dash-consult-card ${c.status === 'waiting' ? 'dash-consult-card--waiting' : ''} ${c.status === 'completed' ? 'dash-consult-card--done' : ''}`}
                >
                  {/* Status badge */}
                  <span className={`dash-status-badge dash-status-badge--${c.status}`}>
                    {{ waiting:'⏳ Waiting', accepted:'🎥 Active', rejected:'✗ Rejected', completed:'✅ Done' }[c.status]}
                  </span>

                  {/* Patient info */}
                  <div className="dash-consult-card__patient">
                    <div className="dash-consult-card__avatar">
                      {c.patientName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3>
                        {c.patientName}
                        {c._isDemo && <span className="dash-demo-badge">DEMO</span>}
                      </h3>
                      <p>{c.patientAge && `${c.patientAge} yrs`} {c.patientGender} · 🗣 {c.patientLang}{c.slot && ` · 🕐 ${c.slot}`}</p>
                    </div>
                  </div>

                  {/* Symptoms */}
                  <div className="dash-consult-card__symptoms">
                    <strong>Symptoms:</strong> {c.patientSymptoms || c.symptoms}
                  </div>

                  <div className="dash-consult-card__contact">
                    <strong>Contact:</strong> {c.patientPhone || 'Not provided'}
                    <span><strong>Mode:</strong> 🎥 Online Teleconsultation</span>
                    <span><strong>Status:</strong> {c.status}</span>
                  </div>

                  {/* AI analysis */}
                  {c.aiResult && (
                    <div className="dash-consult-card__ai">
                      <div className="dash-ai-row">
                        <span className="dash-ai-label">AI Conditions:</span>
                        <span>{c.aiResult.possibleDiseases?.join(', ')}</span>
                      </div>
                      <div className="dash-ai-row">
                        <span className="dash-ai-label">Specialist:</span>
                        <span>{c.aiResult.recommendedSpecialist}</span>
                      </div>
                      <div className="dash-ai-row">
                        <span className="dash-ai-label">Severity:</span>
                        <span style={{ color: SEV_COLOR[c.aiResult.severity], fontWeight: 700 }}>
                          {c.aiResult.severity}
                        </span>
                        <span className="dash-ai-conf">Confidence: {c.aiResult.confidence}%</span>
                      </div>
                      {c.aiResult.emergencyFlag && (
                        <div className="dash-ai-emergency">🚨 Emergency — patient needs urgent attention</div>
                      )}
                    </div>
                  )}

                  {/* Completed notes summary */}
                  {c.status === 'completed' && c.notes && (
                    <div className="dash-consult-card__notes">
                      <strong>Diagnosis:</strong> {c.notes.diagnosis}
                    </div>
                  )}

                  {/* Actions */}
                  {c.status === 'waiting' && (
                    <div className="dash-consult-card__actions">
                      <button
                        id={`accept-${c.id}`}
                        className="dash-action-btn dash-action-btn--accept"
                        onClick={() => handleAccept(c.id)}
                      >
                        ✓ Accept & Start Consultation
                      </button>
                      <button
                        id={`reject-${c.id}`}
                        className="dash-action-btn dash-action-btn--reject"
                        onClick={() => handleReject(c.id)}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}

                  {c.status === 'accepted' && (
                    <div className="dash-consult-card__actions">
                      <button
                        id={`resume-${c.id}`}
                        className="dash-action-btn dash-action-btn--accept"
                        onClick={() => onOpenConsultation(c)}
                      >
                        🎥 Resume Consultation
                      </button>
                    </div>
                  )}

                  {c.status === 'completed' && (
                    <div className="dash-consult-card__actions">
                      <button
                        id={`review-${c.id}`}
                        className="dash-action-btn dash-action-btn--accept"
                        onClick={() => onOpenConsultation(c)}
                      >
                        📁 Open Room / View Prescription & Records
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default DoctorDashboard
