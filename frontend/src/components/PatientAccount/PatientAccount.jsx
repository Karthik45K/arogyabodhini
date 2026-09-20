import React, { useState, useEffect } from 'react'
import './PatientAccount.css'
import { usePatientAuth } from '../../patient/context/PatientContext'
import patientService from '../../patient/services/patientService'
import axios from 'axios'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const initialForm = { name: '', age: '', gender: '', phone: '', email: '', password: '', confirmPassword: '', identifier: '' }

const PatientAccount = ({ onClose, onAuthenticated, initialMode = 'login', initialView = 'profile', showVideoPrompt = false, onJoinVideoRoom }) => {
  const { patient, register, login, logout, token } = usePatientAuth()
  const [mode, setMode] = useState(initialMode)
  const [view, setView] = useState(initialView)
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [items, setItems] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (patient && initialView && initialView !== 'profile') {
      showHistory(initialView)
    }
  }, [patient, initialView])

  const update = (field, value) => {
    setForm(current => ({ ...current, [field]: value }))
    if (errors[field] || errors.form) setErrors(e => ({ ...e, [field]: '', form: '' }))
  }
  const switchMode = (m) => { setMode(m); setForm(initialForm); setErrors({}) }
  
  const showHistory = async (type) => {
    setView(type)
    setItems([])
    if (!patient) return
    try {
      if (type === 'documents') {
        const authToken = patientService.getToken() || token
        const { data } = await axios.get(`${API_BASE_URL}/api/patient/documents`, {
          headers: { Authorization: `Bearer ${authToken}` }
        })
        setItems(data.documents || [])
      } else if (type === 'consultations') {
        const res = await patientService.consultations()
        setItems(res.consultations || [])
      } else if (type === 'prescriptions') {
        const res = await patientService.prescriptions()
        setItems(res.prescriptions || [])
      }
    } catch (err) {
      console.error('Failed to load history', err)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit.")
      return
    }
    const authToken = patientService.getToken() || token
    if (!authToken) {
      alert("Please login to upload medical records.")
      return
    }
    setUploading(true)
    const formData = new FormData()
    formData.append('document', file)
    try {
      await axios.post(`${API_BASE_URL}/api/patient/documents`, formData, {
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'multipart/form-data' }
      })
      e.target.value = '' // reset file input
      showHistory('documents')
    } catch (err) {
      console.error(err)
      alert("Failed to upload document. " + (err.response?.data?.message || err.message))
    } finally {
      setUploading(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const newErrors = {}
    if (mode === 'register') {
      if (!form.name.trim()) newErrors.name = 'Name is required'
      if (!form.phone.trim()) newErrors.phone = 'Mobile number is required'
      if (form.password.length < 6) newErrors.password = 'Password must be at least 6 characters'
      if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
    } else {
      if (!form.identifier.trim()) newErrors.identifier = 'Email or mobile is required'
      if (!form.password) newErrors.password = 'Password is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setSubmitting(false)
      return
    }

    try {
      if (mode === 'register') {
        await register(form)
      } else {
        await login(form.identifier, form.password)
      }
      onAuthenticated && onAuthenticated()
    } catch (error) {
      setErrors({ form: error.response?.data?.message || 'Authentication failed. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrint = (item) => {
    const printWindow = window.open('', '_blank', 'width=850,height=1000')
    if (!printWindow) {
      alert('Please allow popups to download or print the prescription PDF.')
      return
    }

    const meds = item.prescription?.medicines || []
    const medicinesRows = meds.map((m, i) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${i + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${m.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${m.dosage}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${m.frequency}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${m.duration}</td>
      </tr>
    `).join('')

    const sigHash = item.prescription?.digitalSignatureHash || 
      `RX-SIG-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>e-Prescription - ${patient?.name || 'Patient'}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 24px;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #0284c7;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .hospital-name {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 4px 0;
          }
          .tagline {
            font-size: 12px;
            color: #64748b;
            margin: 0;
          }
          .meta-info {
            text-align: right;
            font-size: 13px;
            color: #475569;
          }
          .doctor-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px 18px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
          }
          .patient-grid {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr;
            gap: 16px;
            background: #f1f5f9;
            padding: 14px 18px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 13px;
          }
          .patient-grid label {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 700;
            display: block;
            margin-bottom: 3px;
          }
          .patient-grid strong {
            font-size: 14px;
            color: #0f172a;
          }
          .diagnosis-box {
            margin-bottom: 20px;
            padding: 12px 18px;
            background: #ecfeff;
            border-left: 4px solid #06b6d4;
            border-radius: 4px;
          }
          .rx-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
            font-size: 13px;
          }
          .rx-table th {
            background: #0f172a;
            color: #fff;
            padding: 10px;
            text-align: left;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .callout {
            background: #fefce8;
            border: 1px solid #fef08a;
            border-radius: 8px;
            padding: 14px 18px;
            margin-bottom: 20px;
            font-size: 13px;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 36px;
            padding-top: 20px;
            border-top: 2px dashed #cbd5e1;
          }
          .seal-box {
            border: 2px solid #0284c7;
            border-radius: 8px;
            padding: 12px 18px;
            text-align: center;
            background: #f0f9ff;
            max-width: 260px;
          }
          .footer {
            margin-top: 30px;
            font-size: 11px;
            color: #94a3b8;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="hospital-name">Arogyabodhini Telemedicine Clinic</h1>
            <p class="tagline">Arogyabodhini — AI Powered Multilingual Healthcare Platform</p>
          </div>
          <div class="meta-info">
            <p style="margin: 0 0 4px 0;"><strong>Date:</strong> ${new Date(item.consultationDate).toLocaleDateString('en-IN')}</p>
            <p style="margin: 0; color: #0284c7; font-weight: 600;">Ref ID: ${item.consultationId || 'CONS-ONLINE'}</p>
          </div>
        </div>

        <div class="doctor-card">
          <div>
            <div style="font-size: 16px; font-weight: 800; color: #0f172a;">Dr. ${item.doctorName}</div>
            <div style="font-size: 13px; color: #0284c7; font-weight: 600;">${item.doctorSpecialty || 'Consulting Specialist'}</div>
          </div>
          <div style="text-align: right; font-size: 12px; color: #64748b;">
            <div>Council Reg: <strong>MCI-VERIFIED</strong></div>
            <div>Status: <strong>Digitally Prescribed & Certified</strong></div>
          </div>
        </div>

        <div class="patient-grid">
          <div>
            <label>Patient Name</label>
            <strong>${patient?.name || 'Patient'}</strong>
          </div>
          <div>
            <label>Age / Gender</label>
            <strong>${patient?.age || '-'} yrs / ${patient?.gender || '-'}</strong>
          </div>
          <div>
            <label>Patient ID</label>
            <strong>${patient?.patientId || '-'}</strong>
          </div>
        </div>

        <div class="diagnosis-box">
          <span style="font-size: 11px; font-weight: 700; color: #0891b2; text-transform: uppercase;">Clinical Diagnosis:</span>
          <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 3px;">${item.diagnosis || 'Clinical Consultation'}</div>
        </div>

        <h3 style="font-size: 15px; margin: 0 0 10px 0; color: #0f172a; display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 20px; font-family: serif; color: #0284c7;">℞</span> Prescribed Medications
        </h3>

        <table class="rx-table">
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>Medicine Name</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            ${medicinesRows || '<tr><td colspan="5" style="text-align:center; padding: 12px;">No medications prescribed.</td></tr>'}
          </tbody>
        </table>

        ${item.prescription?.advice ? `
          <div class="callout">
            <strong style="color: #854d0e;">Doctor's Advice & Lifestyle Instructions:</strong>
            <p style="margin: 4px 0 0 0; color: #713f12;">${item.prescription.advice}</p>
          </div>
        ` : ''}

        ${item.prescription?.followUp ? `
          <div style="font-size: 13px; color: #475569; margin-bottom: 20px;">
            <strong>Recommended Follow-up:</strong> ${item.prescription.followUp}
          </div>
        ` : ''}

        <div class="signature-section">
          <div class="seal-box">
            <div style="font-size: 12px; font-weight: 800; color: #0284c7; text-transform: uppercase;">
              ✓ Verified Digital Signature
            </div>
            <div style="font-size: 11px; color: #475569; margin: 4px 0;">
              Telemedicine Practice Guidelines 2020
            </div>
            <div style="font-family: monospace; font-size: 10px; color: #64748b; margin-top: 4px;">
              Hash: ${sigHash}
            </div>
          </div>

          <div style="text-align: right;">
            <div style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 26px; color: #1e3a8a; margin-bottom: 4px;">
              Dr. ${item.doctorName}
            </div>
            <div style="border-top: 1.5px solid #0f172a; width: 180px; margin-left: auto; padding-top: 4px;">
              <div style="font-weight: 700; font-size: 13px; color: #0f172a;">Dr. ${item.doctorName}</div>
              <div style="font-size: 11px; color: #64748b;">${item.doctorSpecialty || 'Specialist'}</div>
              <div style="font-size: 11px; color: #64748b;">Council Reg: MCI-VERIFIED</div>
            </div>
          </div>
        </div>

        <div class="footer">
          This digital e-prescription is valid across licensed pharmacies in India under the IT Act 2000.
          For emergency medical assistance, dial 108 immediately.
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 350)
  }

  const renderHistoryItem = (item) => {
    if (view === 'consultations') {
      const isAccepted = item.status === 'accepted'
      const isWaiting = item.status === 'waiting'
      const isCompleted = item.status === 'completed'
      return (
        <article className="patient-history__item" key={item.id} style={{ borderLeft: isAccepted ? '4px solid #16a34a' : isWaiting ? '4px solid #eab308' : '4px solid #cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>Dr. {item.doctorName}</strong>
              <span style={{ display: 'block', color: '#64748b', fontSize: '0.8rem', marginTop: '2px' }}>
                📅 {new Date(item.createdAt).toLocaleDateString('en-IN')} {item.slot ? `· Slot: ${item.slot}` : ''}
              </span>
            </div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '12px',
              background: isAccepted ? '#dcfce7' : isWaiting ? '#fef9c3' : '#f1f5f9',
              color: isAccepted ? '#15803d' : isWaiting ? '#a16207' : '#475569'
            }}>
              {isAccepted ? '🟢 Doctor Ready / Active' : isWaiting ? '⏳ Waiting for Doctor' : '✅ Completed'}
            </span>
          </div>

          <p style={{ margin: '8px 0 4px', fontSize: '0.85rem', color: '#334155' }}>
            <strong>Symptoms:</strong> {item.symptoms || item.patientSymptoms}
          </p>
          {item.notes?.diagnosis && (
            <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#0369a1' }}>
              <b>Clinical Diagnosis:</b> {item.notes.diagnosis}
            </p>
          )}

          {/* Action buttons for video consultation */}
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(isAccepted || isWaiting) && onJoinVideoRoom && (
              <button
                type="button"
                onClick={() => {
                  onClose?.()
                  onJoinVideoRoom(item.id, patient?.name || item.patientName)
                }}
                style={{
                  padding: '8px 16px',
                  background: isAccepted ? '#16a34a' : '#1565c0',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isAccepted ? '0 0 12px rgba(22, 163, 74, 0.4)' : 'none'
                }}
              >
                🎥 {isAccepted ? 'Join Video Call Now (Doctor Ready!)' : 'Enter Waiting Room / Video Call'}
              </button>
            )}

            {isCompleted && item.prescription && (
              <button
                type="button"
                className="print-btn"
                onClick={() => handlePrint(item)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.82rem'
                }}
              >
                🖨️ View / Print Prescription
              </button>
            )}
          </div>
        </article>
      )
    }
    if (view === 'prescriptions') return (
      <article className="patient-history__item" key={item.consultationId}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <strong>Dr. {item.doctorName}</strong>
            <span style={{ display: 'block', color: '#64748b', fontSize: '0.8rem', marginTop: '2px' }}>
              {item.doctorSpecialty ? `${item.doctorSpecialty} • ` : ''}{new Date(item.consultationDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <button className="print-btn" onClick={() => handlePrint(item)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0284c7', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
            🖨️ Print / PDF
          </button>
        </div>
        <p style={{ margin: '8px 0 4px', fontSize: '0.88rem' }}><b>Diagnosis:</b> {item.diagnosis || 'Clinical Consultation'}</p>
        <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#334155' }}>
          <b>Medications:</b> {item.prescription?.medicines?.map(m => `${m.name} (${m.dosage}, ${m.frequency})`).join(', ') || 'None'}
        </p>
        {item.prescription?.advice && (
          <small style={{ color: '#0369a1', display: 'block', marginTop: '4px' }}>
            <b>Advice:</b> {item.prescription.advice}
          </small>
        )}
      </article>
    )
    if (view === 'documents') return (
      <div className="patient-doc-card" key={item._id}>
        <a href={`${API_BASE_URL}${item.fileUrl}`} target="_blank" rel="noopener noreferrer">{item.title}</a>
        <p style={{ fontSize: '0.8rem', color: '#607d8b', margin: '4px 0 0' }}>{new Date(item.uploadedAt).toLocaleDateString('en-IN')} - {(item.sizeBytes / 1024).toFixed(1)} KB</p>
      </div>
    )
  }

  if (!patient) return (
    <div className="patient-modal-backdrop" onMouseDown={onClose}>
      <section className="patient-modal" onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="patient-auth-title">
        <button className="patient-modal__close" onClick={onClose} aria-label="Close">&times;</button>
        <div className="patient-auth-switch" role="tablist" aria-label="Patient account actions">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')} role="tab">Login</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')} role="tab">Create Account</button>
        </div>
        {showVideoPrompt && <div className="patient-video-prompt"><strong>Create a patient account or login to continue</strong><span>Your account lets us save your consultations and prescriptions so you can access them later.</span></div>}
        <h2 id="patient-auth-title">{mode === 'login' ? 'Patient Login' : 'Create Patient Account'}</h2>
        <p className="patient-modal__hint">Save your consultations and prescriptions in one secure place.</p>
        <form onSubmit={submit} className="patient-form" noValidate>
          {mode === 'register' ? <>
            <label>Full name *<input autoComplete="name" placeholder="e.g. Ananya Sharma" value={form.name} onChange={event => update('name', event.target.value)} aria-invalid={!!errors.name} />{errors.name && <small>{errors.name}</small>}</label>
            <div className="patient-form__row"><label>Age<input type="number" min="1" max="120" placeholder="e.g. 34" value={form.age} onChange={event => update('age', event.target.value)} /></label><label>Gender<select value={form.gender} onChange={event => update('gender', event.target.value)}><option value="">Select</option><option>Female</option><option>Male</option><option>Other</option></select></label></div>
            <label>Mobile number *<input autoComplete="tel" type="tel" placeholder="e.g. 9876543210" value={form.phone} onChange={event => update('phone', event.target.value)} aria-invalid={!!errors.phone} />{errors.phone && <small>{errors.phone}</small>}</label>
            <label>Email <span className="patient-form__optional">(optional)</span><input autoComplete="email" type="email" placeholder="you@example.com" value={form.email} onChange={event => update('email', event.target.value)} /></label>
            <label>Password *<span className="patient-password"><input autoComplete="new-password" type={showPassword ? 'text' : 'password'} placeholder="At least 6 characters" value={form.password} onChange={event => update('password', event.target.value)} aria-invalid={!!errors.password} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></span>{errors.password && <small>{errors.password}</small>}</label>
            <label>Confirm password *<span className="patient-password"><input autoComplete="new-password" type={showConfirmPassword ? 'text' : 'password'} placeholder="Re-enter your password" value={form.confirmPassword} onChange={event => update('confirmPassword', event.target.value)} aria-invalid={!!errors.confirmPassword} /><button type="button" onClick={() => setShowConfirmPassword(value => !value)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>{showConfirmPassword ? 'Hide' : 'Show'}</button></span>{errors.confirmPassword && <small>{errors.confirmPassword}</small>}</label>
          </> : <>
            <label>Email or mobile number *<input autoComplete="username" placeholder="you@example.com or 9876543210" value={form.identifier} onChange={event => update('identifier', event.target.value)} aria-invalid={!!errors.identifier} />{errors.identifier && <small>{errors.identifier}</small>}</label>
            <label>Password *<span className="patient-password"><input autoComplete="current-password" type={showPassword ? 'text' : 'password'} placeholder="Your password" value={form.password} onChange={event => update('password', event.target.value)} aria-invalid={!!errors.password} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></span>{errors.password && <small>{errors.password}</small>}</label>
          </>}
          {errors.form && <p className="patient-form__error" role="alert">{errors.form}</p>}
          <button className="patient-form__submit" disabled={submitting}>{submitting ? 'Signing you in...' : mode === 'login' ? 'Login' : 'Create Account'}</button>
        </form>
        <p className="patient-auth-footer">{mode === 'login' ? 'New to Arogyabodhini?' : 'Already have an account?'} <button onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create Account' : 'Login'}</button></p>
      </section>
    </div>
  )

  return (
    <div className="patient-modal-backdrop" onMouseDown={onClose}>
      <section className="patient-modal patient-modal--account" onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true">
        <button className="patient-modal__close" onClick={onClose} aria-label="Close">&times;</button>
        <div className="patient-account__top"><div><p className="patient-account__eyebrow">Patient account</p><h2>Hi, {patient.name.split(/\s+/)[0]}</h2></div><span className="patient-account__id">{patient.patientId}</span></div>
        <nav className="patient-account__tabs">
          <button className={view === 'profile' ? 'active' : ''} onClick={() => setView('profile')}>My Profile</button>
          <button className={view === 'consultations' ? 'active' : ''} onClick={() => showHistory('consultations')}>My Consultations</button>
          <button className={view === 'prescriptions' ? 'active' : ''} onClick={() => showHistory('prescriptions')}>My Prescriptions</button>
          <button className={view === 'documents' ? 'active' : ''} onClick={() => showHistory('documents')}>Medical Records</button>
        </nav>
        {errors.form && <p className="patient-form__error" role="alert">{errors.form}</p>}
        {view === 'profile' ? <div className="patient-profile-grid">{[['Name', patient.name], ['Age', patient.age || 'Not provided'], ['Gender', patient.gender || 'Not provided'], ['Mobile', patient.phone], ['Email', patient.email || 'Not provided']].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div> : (
          <div className="patient-history">
            {view === 'documents' && (
              <label className="patient-doc-upload">
                <input type="file" onChange={handleUpload} accept="application/pdf,image/png,image/jpeg" disabled={uploading} />
                {uploading ? 'Uploading...' : 'Click here to upload previous prescriptions or lab reports'}
              </label>
            )}
            {view === 'documents' ? (
              <div className="patient-docs-grid">
                {items.length === 0 && <p className="patient-history__empty" style={{ gridColumn: '1 / -1' }}>No records uploaded yet.</p>}
                {items.map(renderHistoryItem)}
              </div>
            ) : (
              <>
                {items.length === 0 && <p className="patient-history__empty">No records yet.</p>}
                {items.map(renderHistoryItem)}
              </>
            )}
          </div>
        )}
        <button className="patient-account__logout" onClick={logout}>Logout</button>
      </section>
    </div>
  )
}

export default PatientAccount
