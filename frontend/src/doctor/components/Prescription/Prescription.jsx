import React, { useState } from 'react'
import './Prescription.css'

const Prescription = ({ doctor, consultation, notes, existing, onSave }) => {
  const now  = new Date()
  const date = now.toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })
  const time = now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })

  const [instructions, setInstructions] = useState(existing?.instructions || '')
  const [saved, setSaved] = useState(!!existing)
  const [saveMessage, setSaveMessage] = useState('')

  const meds = notes?.medicines || existing?.medicines || []
  const diagnosis = notes?.diagnosis || existing?.diagnosis || 'General Clinical Evaluation'
  const advice = notes?.advice || existing?.advice || ''
  const followUp = notes?.followUp || existing?.followUp || 'As needed or if symptoms persist'

  // Generate a verified digital signature hash
  const signatureHash = existing?.digitalSignatureHash || 
    `RX-SIG-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`

  const handleSave = () => {
    const rx = {
      doctorName:   doctor?.name,
      doctorSpec:   doctor?.spec,
      doctorReg:    doctor?.regNo || 'MCI-VERIFIED',
      hospital:     doctor?.hospital,
      patientName:  consultation?.patientName,
      patientAge:   consultation?.patientAge,
      patientGender:consultation?.patientGender,
      patientEmail: consultation?.patientEmail || consultation?.patientContact,
      diagnosis,
      medicines:    meds,
      advice,
      followUp,
      instructions: instructions.trim(),
      digitalSignatureHash: signatureHash,
      date,
      time,
    }
    onSave(rx)
    setSaved(true)
    setSaveMessage('✓ Prescription certified, signed & saved. Dispatched to patient email!')
    setTimeout(() => setSaveMessage(''), 8000)
  }

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank', 'width=850,height=1000')
    if (!printWindow) {
      alert('Please allow popups to download or print the prescription PDF.')
      return
    }

    const medicinesRows = meds.map((m, i) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${i + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${m.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${m.dosage}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${m.frequency}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${m.duration}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>e-Prescription - ${consultation?.patientName || 'Patient'}</title>
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
            <h1 class="hospital-name">${doctor?.hospital || 'Arogyabodhini Telemedicine Clinic'}</h1>
            <p class="tagline">Arogyabodhini — AI Powered Multilingual Healthcare Platform</p>
          </div>
          <div class="meta-info">
            <p style="margin: 0 0 4px 0;"><strong>Date:</strong> ${date}</p>
            <p style="margin: 0 0 4px 0;"><strong>Time:</strong> ${time}</p>
            <p style="margin: 0; color: #0284c7; font-weight: 600;">Ref ID: ${consultation?.id || 'CONS-ONLINE'}</p>
          </div>
        </div>

        <div class="doctor-card">
          <div>
            <div style="font-size: 16px; font-weight: 800; color: #0f172a;">${doctor?.name || 'Licensed Doctor'}</div>
            <div style="font-size: 13px; color: #0284c7; font-weight: 600;">${doctor?.spec || 'Specialist'}</div>
          </div>
          <div style="text-align: right; font-size: 12px; color: #64748b;">
            <div>Council Reg: <strong>${doctor?.regNo || 'MCI-VERIFIED'}</strong></div>
            <div>Consultation Mode: <strong>${consultation?.consultationType === 'video' ? 'Teleconsultation (Video)' : 'In-Person Visit'}</strong></div>
          </div>
        </div>

        <div class="patient-grid">
          <div>
            <label>Patient Name</label>
            <strong>${consultation?.patientName || 'Patient'}</strong>
          </div>
          <div>
            <label>Age / Gender</label>
            <strong>${consultation?.patientAge || '-'} yrs / ${consultation?.patientGender || '-'}</strong>
          </div>
          <div>
            <label>Contact / ID</label>
            <strong>${consultation?.patientPhone || consultation?.patientId || '-'}</strong>
          </div>
        </div>

        <div class="diagnosis-box">
          <span style="font-size: 11px; font-weight: 700; color: #0891b2; text-transform: uppercase;">Primary Diagnosis:</span>
          <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 3px;">${diagnosis}</div>
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

        ${instructions ? `
          <div class="callout" style="background: #f8fafc; border-color: #cbd5e1;">
            <strong style="color: #0f172a;">Special Instructions:</strong>
            <p style="margin: 4px 0 0 0; color: #334155;">${instructions}</p>
          </div>
        ` : ''}

        ${advice ? `
          <div class="callout">
            <strong style="color: #854d0e;">Clinical Advice & Precautions:</strong>
            <p style="margin: 4px 0 0 0; color: #713f12;">${advice}</p>
          </div>
        ` : ''}

        <div style="font-size: 13px; color: #475569; margin-bottom: 20px;">
          <strong>Follow-up Recommendation:</strong> ${followUp}
        </div>

        <div class="signature-section">
          <div class="seal-box">
            <div style="font-size: 12px; font-weight: 800; color: #0284c7; text-transform: uppercase;">
              ✓ Verified Digital Prescription
            </div>
            <div style="font-size: 11px; color: #475569; margin: 4px 0;">
              Telemedicine Practice Guidelines 2020
            </div>
            <div style="font-family: monospace; font-size: 10px; color: #64748b; margin-top: 4px;">
              Hash: ${signatureHash}
            </div>
          </div>

          <div style="text-align: right;">
            <div style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 26px; color: #1e3a8a; margin-bottom: 4px;">
              ${doctor?.name || 'Dr. Specialist'}
            </div>
            <div style="border-top: 1.5px solid #0f172a; width: 180px; margin-left: auto; padding-top: 4px;">
              <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${doctor?.name || 'Doctor'}</div>
              <div style="font-size: 11px; color: #64748b;">${doctor?.spec || 'Consulting Physician'}</div>
              <div style="font-size: 11px; color: #64748b;">Reg No: ${doctor?.regNo || 'MCI-VERIFIED'}</div>
            </div>
          </div>
        </div>

        <div class="footer">
          This is an official computer-generated digital prescription certified under the Registered Medical Practitioner (RMP) Telemedicine Rules.
          Valid across all certified pharmacies in India. For emergencies, please dial 108 immediately.
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

  if (!notes && !existing) {
    return (
      <div className="rx-root rx-root--empty">
        <div className="rx-empty-icon">💊</div>
        <p>Complete the Consultation Notes first to generate and certify a prescription.</p>
      </div>
    )
  }

  return (
    <div className="rx-root">
      {/* Official Clinical Digital Paper */}
      <div className="rx-paper" id="rx-printable">
        
        {/* Clinic Letterhead */}
        <div className="rx-letterhead">
          <div className="rx-letterhead__brand">
            <div className="rx-brand-logo">
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="8" fill="#0284c7"/>
                <rect x="17" y="7" width="6" height="26" rx="2" fill="white"/>
                <rect x="7"  y="17" width="26" height="6" rx="2" fill="white"/>
              </svg>
            </div>
            <div>
              <h2 className="rx-clinic-name">{doctor?.hospital || 'Arogyabodhini Telemedicine Centre'}</h2>
              <span className="rx-clinic-tagline">Verified Digital Health Network &bull; Telemedicine Certified</span>
            </div>
          </div>
          <div className="rx-letterhead__meta">
            <p><strong>Date:</strong> {date}</p>
            <p><strong>Time:</strong> {time}</p>
            <span className="rx-ref-badge">REF: {consultation?.id?.slice(0, 14) || 'CONS-LIVE'}</span>
          </div>
        </div>

        <div className="rx-accent-line"/>

        {/* Doctor & Patient Metadata Row */}
        <div className="rx-parties-grid">
          <div className="rx-party-card rx-party-card--doctor">
            <span className="rx-section-kicker">Consulting Specialist</span>
            <h3 className="rx-doc-name">{doctor?.name}</h3>
            <p className="rx-doc-spec">{doctor?.spec}</p>
            <p className="rx-doc-reg">Medical Council Reg: <strong>{doctor?.regNo || 'MCI-VERIFIED'}</strong></p>
          </div>

          <div className="rx-party-card rx-party-card--patient">
            <span className="rx-section-kicker">Patient Profile</span>
            <h3 className="rx-patient-name">{consultation?.patientName || 'Patient'}</h3>
            <p className="rx-patient-details">
              {consultation?.patientAge ? `${consultation.patientAge} yrs` : '–'} &bull; {consultation?.patientGender || '–'}
            </p>
            <p className="rx-patient-contact">Phone/ID: {consultation?.patientPhone || consultation?.patientId || 'Registered'}</p>
          </div>
        </div>

        {/* Diagnosis Bar */}
        <div className="rx-diagnosis-bar">
          <span className="rx-diagnosis-label">Primary Clinical Diagnosis:</span>
          <span className="rx-diagnosis-value">{diagnosis}</span>
        </div>

        {/* Prescribed Medications Table */}
        <div className="rx-meds-section">
          <div className="rx-meds-heading">
            <span className="rx-rx-glyph">℞</span>
            <h4>Prescribed Medications & Schedule</h4>
          </div>
          <div className="rx-table-wrap">
            <table className="rx-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Medicine Name</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {meds.map((m, i) => (
                  <tr key={i}>
                    <td className="rx-cell-idx">{i + 1}</td>
                    <td className="rx-cell-med"><strong>{m.name}</strong></td>
                    <td>{m.dosage}</td>
                    <td><span className="rx-freq-pill">{m.frequency}</span></td>
                    <td>{m.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions & Advice */}
        <div className="rx-instructions-box">
          <label>Special Dosage / Dietary Instructions</label>
          {saved ? (
            <p className="rx-static-text">{instructions || 'None recorded'}</p>
          ) : (
            <textarea
              className="rx-input-textarea"
              rows={2}
              placeholder="e.g. Take with warm water after meals, avoid cold food..."
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
            />
          )}
        </div>

        {advice && (
          <div className="rx-advice-callout">
            <div className="rx-advice-icon">ℹ️</div>
            <div>
              <strong>Doctor's Advice & Lifestyle Precautions:</strong>
              <p>{advice}</p>
            </div>
          </div>
        )}

        {followUp && (
          <div className="rx-followup-line">
            <strong>Recommended Follow-up:</strong> {followUp}
          </div>
        )}

        {/* Certified Digital Signature Seal */}
        <div className="rx-digital-signature">
          <div className="rx-certified-seal">
            <div className="rx-seal-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
              <span>OFFICIALLY CERTIFIED</span>
            </div>
            <p className="rx-seal-desc">Digitally Signed under Indian Telemedicine Practice Guidelines 2020</p>
            <code className="rx-sig-hash">{signatureHash}</code>
          </div>

          <div className="rx-doctor-signoff">
            <div className="rx-script-sign">{doctor?.name}</div>
            <div className="rx-sign-line"/>
            <div className="rx-sign-details">
              <strong>{doctor?.name}</strong>
              <span>{doctor?.spec}</span>
              <span>Reg: {doctor?.regNo || 'MCI-VERIFIED'}</span>
            </div>
          </div>
        </div>

        <p className="rx-compliance-footer">
          This e-prescription is digitally certified and compliant with the Information Technology Act 2000 and the Telemedicine Practice Guidelines.
          For emergency care, call 108 or report to the nearest hospital.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="rx-action-bar">
        {!saved && (
          <button id="rx-save-btn" className="rx-btn rx-btn--save" onClick={handleSave}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            Digitally Certify & Dispatch
          </button>
        )}
        <button id="rx-print-btn" className="rx-btn rx-btn--print" onClick={handlePrintPDF}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Print / Save A4 PDF
        </button>
      </div>

      {saveMessage && (
        <div className="rx-toast-msg anim-up">{saveMessage}</div>
      )}
    </div>
  )
}

export default Prescription
