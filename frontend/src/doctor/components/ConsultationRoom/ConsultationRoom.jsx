import React, { useState, useEffect } from 'react'
import './ConsultationRoom.css'
import { useDoctorAuth } from '../../context/DoctorContext'
import VideoCallRoom        from '../VideoCallRoom/VideoCallRoom'
import ConsultationNotes    from '../ConsultationNotes/ConsultationNotes'
import Prescription         from '../Prescription/Prescription'
import consultationService  from '../../services/consultationService'
import axios from 'axios'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const PatientRecordsPanel = ({ patientId, token }) => {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!patientId || !token) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    axios.get(`${API_BASE_URL}/api/doctors/patient-documents/${patientId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setDocs(res.data.documents || [])
        setLoading(false)
      })
      .catch(err => {
        console.error("Could not fetch documents", err)
        setError(err.response?.data?.message || 'Could not fetch patient documents.')
        setLoading(false)
      })
  }, [patientId, token])

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', minHeight: '420px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📁</span> Patient's Medical Records & Lab Reports
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Historical documents, blood tests, and prior prescriptions uploaded by patient.
          </p>
        </div>
        <span style={{ fontSize: '0.85rem', padding: '4px 10px', background: '#f1f5f9', color: '#475569', borderRadius: '12px', fontWeight: 600 }}>
          {docs.length} Document{docs.length === 1 ? '' : 's'}
        </span>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#64748b', gap: '10px' }}>
          <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span> Loading patient records...
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.9rem' }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && docs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📄</div>
          <p style={{ margin: 0, fontSize: '1rem', color: '#475569', fontWeight: 500 }}>No medical records found for this patient.</p>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>The patient has not uploaded any test reports or prescriptions yet.</p>
        </div>
      )}

      {!loading && docs.length > 0 && (
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {docs.map(item => {
            const isPdf = item.fileType?.includes('pdf') || item.title?.toLowerCase().endsWith('.pdf')
            const fileHref = `${API_BASE_URL}${item.fileUrl}`
            return (
              <div
                key={item._id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '1.5rem' }}>{isPdf ? '📕' : '🖼️'}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: isPdf ? '#fee2e2' : '#e0e7ff', color: isPdf ? '#991b1b' : '#3730a3' }}>
                      {isPdf ? 'PDF' : 'IMAGE'}
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '0.95rem', color: '#1e293b', wordBreak: 'break-word', lineHeight: 1.4 }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                    📅 {new Date(item.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}{(item.sizeBytes / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                  <a
                    href={fileHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '8px 12px',
                      background: '#1565c0',
                      color: '#fff',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    👁️ View Record
                  </a>
                  <a
                    href={fileHref}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 12px',
                      background: '#f1f5f9',
                      color: '#334155',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      textDecoration: 'none'
                    }}
                    title="Download document"
                  >
                    ⬇️
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const SEV_COLOR = { High:'#c62828', Moderate:'#e65100', Low:'#2e7d32' }
const SEV_BG    = { High:'#ffebee', Moderate:'#fff3e0', Low:'#e8f5e9' }

const ConsultationRoom = ({ consultation, onBack }) => {
  const { doctor } = useDoctorAuth()
  const [panel, setPanel]             = useState('video') // video | notes | prescription
  const [savedNotes, setSavedNotes]   = useState(consultation.notes || null)
  const [savedRx,    setSavedRx]      = useState(consultation.prescription || null)
  const [completed,  setCompleted]    = useState(consultation.status === 'completed')

  if (!consultation) return null
  const { aiResult, patientName, patientAge, patientGender, patientLang, symptoms, slot, consultationType } = consultation
  const sev = aiResult?.severity || 'Low'

  const handleSaveNotes = async (notes) => {
    const updated = await consultationService.saveNotes(consultation.id, notes)
    setSavedNotes(notes)
    setCompleted(true)
    if (updated?.prescription) setSavedRx(updated.prescription)
  }

  const handleSaveRx = async (rx) => {
    await consultationService.savePrescription(consultation.id, rx)
    setSavedRx(rx)
  }

  return (
    <div className="croom-root">

      {/* Top bar */}
      <div className="croom-topbar">
        <button id="croom-back-btn" className="croom-back-btn" onClick={onBack}>
          ← Dashboard
        </button>
        <div className="croom-topbar__center">
          <span className="croom-topbar__title">Consultation Room</span>
          {completed && <span className="croom-completed-badge">✅ Completed</span>}
        </div>
        <div className="croom-topbar__doc">
          <div className="croom-topbar__avatar" style={{ background: doctor?.bgColor }}>
            {doctor?.initials}
          </div>
          <span>{doctor?.name}</span>
        </div>
      </div>

      <div className="croom-body">

        {/* ── Left panel ── */}
        <div className="croom-left">

          {/* Panel tabs */}
          <div className="croom-tabs">
            {[
              { id:'video',        label:'📹 Video Call'   },
              { id:'notes',        label:'📝 Notes'        },
              { id:'prescription', label:'💊 Prescription' },
              { id:'records',      label:'📁 Patient Records' },
            ].map(t => (
              <button
                key={t.id}
                id={`croom-tab-${t.id}`}
                className={`croom-tab ${panel === t.id ? 'croom-tab--active' : ''}`}
                onClick={() => setPanel(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Keep VideoCallRoom mounted to avoid destroying ZEGO mid-call on tab switch */}
          <div className="croom-video-wrap" style={{ display: panel === 'video' ? 'flex' : 'none' }}>
            <VideoCallRoom
              consultationId={consultation.id}
              role="doctor"
              userName={doctor?.name || 'Doctor'}
              autoJoin={consultation.consultationType === 'video'}
            />
          </div>

          {panel === 'records' && (
            <PatientRecordsPanel
              patientId={consultation.patientId || consultation.id}
              token={localStorage.getItem('ab_doctor_token') || doctor?.token || localStorage.getItem('doctor_token')}
            />
          )}

          {panel === 'notes' && (
            <ConsultationNotes
              existing={savedNotes}
              onSave={handleSaveNotes}
              completed={completed}
            />
          )}

          {panel === 'prescription' && (
            <Prescription
              doctor={doctor}
              consultation={consultation}
              notes={savedNotes}
              existing={savedRx}
              onSave={handleSaveRx}
            />
          )}
        </div>

        {/* ── Right panel: Patient info ── */}
        <div className="croom-right">

          {/* Patient card */}
          <div className="croom-patient-card">
            <h3 className="croom-section-title">👤 Patient Information</h3>
            <div className="croom-info-grid">
              <div><label>Name</label><span>{patientName}</span></div>
              <div><label>Age</label><span>{patientAge || '–'} yrs</span></div>
              <div><label>Gender</label><span>{patientGender || '–'}</span></div>
              <div><label>Language</label><span>{patientLang}</span></div>
              {consultationType !== 'video' && <div><label>Slot</label><span>{slot || '–'}</span></div>}
            </div>
          </div>

          {/* Symptoms */}
          <div className="croom-symptoms-card">
            <h3 className="croom-section-title">🩺 Reported Symptoms</h3>
            <p className="croom-symptoms-text">{symptoms}</p>
          </div>

          {/* AI Analysis */}
          {aiResult && (
            <div className="croom-ai-card" style={{ borderColor: SEV_COLOR[sev] }}>
              <h3 className="croom-section-title">🤖 AI Analysis</h3>

              <div className="croom-ai-sev"
                style={{ background: SEV_BG[sev], color: SEV_COLOR[sev] }}>
                {sev} Severity · {aiResult.confidence}% confidence
                {aiResult.emergencyFlag && <span> 🚨 EMERGENCY</span>}
              </div>

              <div className="croom-ai-row">
                <label>Possible Conditions</label>
                <div className="croom-chips">
                  {aiResult.possibleDiseases?.map(d => (
                    <span key={d} className="croom-chip">{d}</span>
                  ))}
                </div>
              </div>

              <div className="croom-ai-row">
                <label>Recommended Specialist</label>
                <span className="croom-spec">{aiResult.recommendedSpecialist}</span>
              </div>

              {aiResult.urgencyNote && (
                <div className="croom-urgency">ℹ️ {aiResult.urgencyNote}</div>
              )}
            </div>
          )}

          {/* Saved notes summary */}
          {savedNotes && (
            <div className="croom-notes-summary">
              <h3 className="croom-section-title">📋 Consultation Notes</h3>
              <p><strong>Diagnosis:</strong> {savedNotes.diagnosis}</p>
              {savedNotes.advice    && <p><strong>Advice:</strong> {savedNotes.advice}</p>}
              {savedNotes.followUp  && <p><strong>Follow-up:</strong> {savedNotes.followUp}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConsultationRoom
