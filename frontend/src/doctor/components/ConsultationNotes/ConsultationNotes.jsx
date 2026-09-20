import React, { useState } from 'react'
import './ConsultationNotes.css'

const EMPTY_MED = { name: '', dosage: '', frequency: 'Twice daily', duration: '3 days' }

const ConsultationNotes = ({ existing, onSave, completed }) => {
  const [diagnosis, setDiagnosis] = useState(existing?.diagnosis  || '')
  const [medicines, setMedicines] = useState(existing?.medicines  || [{ ...EMPTY_MED }])
  const [advice,    setAdvice]    = useState(existing?.advice     || '')
  const [followUp,  setFollowUp]  = useState(existing?.followUp   || '')
  const [saved,     setSaved]     = useState(!!existing)

  const addMed  = () => setMedicines(m => [...m, { ...EMPTY_MED }])
  const removeMed = (i) => setMedicines(m => m.filter((_, idx) => idx !== i))
  const updateMed = (i, field, value) => setMedicines(m => m.map((med, idx) => idx === i ? { ...med, [field]: value } : med))

  const handleSave = (e) => {
    e.preventDefault()
    if (!diagnosis.trim()) return
    const notes = { diagnosis: diagnosis.trim(), medicines, advice: advice.trim(), followUp: followUp.trim() }
    onSave(notes)
    setSaved(true)
  }

  return (
    <div className="cnotes-root">
      <h3 className="cnotes-title">Consultation Notes</h3>

      {saved && !completed && (
        <div className="cnotes-saved-banner">✅ Notes saved — consultation marked as completed.</div>
      )}

      <form className="cnotes-form" onSubmit={handleSave} noValidate>

        {/* Diagnosis */}
        <div className="cnotes-field">
          <label htmlFor="cn-diagnosis">Diagnosis <span className="cnotes-req">*</span></label>
          <textarea
            id="cn-diagnosis"
            className="cnotes-textarea"
            rows={3}
            placeholder="Enter primary diagnosis..."
            value={diagnosis}
            onChange={e => setDiagnosis(e.target.value)}
            disabled={completed}
            required
          />
        </div>

        {/* Medicines */}
        <div className="cnotes-field">
          <label>Prescription Medicines</label>
          {medicines.map((med, i) => (
            <div key={i} className="cnotes-med-row">
              <input className="cnotes-input cnotes-med-name" placeholder="Medicine name"
                value={med.name} onChange={e => updateMed(i, 'name', e.target.value)} disabled={completed} />
              <input className="cnotes-input" placeholder="Dosage" style={{ width:90 }}
                value={med.dosage} onChange={e => updateMed(i, 'dosage', e.target.value)} disabled={completed} />
              <select className="cnotes-select"
                value={med.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)} disabled={completed}>
                {['Once daily','Twice daily','Three times daily','As needed','At bedtime'].map(f => (
                  <option key={f}>{f}</option>
                ))}
              </select>
              <input className="cnotes-input" placeholder="Duration" style={{ width:90 }}
                value={med.duration} onChange={e => updateMed(i, 'duration', e.target.value)} disabled={completed} />
              {!completed && medicines.length > 1 && (
                <button type="button" className="cnotes-remove-btn" onClick={() => removeMed(i)} aria-label="Remove medicine">✕</button>
              )}
            </div>
          ))}
          {!completed && (
            <button type="button" className="cnotes-add-med-btn" onClick={addMed}>+ Add Medicine</button>
          )}
        </div>

        {/* Advice */}
        <div className="cnotes-field">
          <label htmlFor="cn-advice">Advice & Instructions</label>
          <textarea id="cn-advice" className="cnotes-textarea" rows={2}
            placeholder="Rest, diet, lifestyle advice..." value={advice}
            onChange={e => setAdvice(e.target.value)} disabled={completed} />
        </div>

        {/* Follow-up */}
        <div className="cnotes-field">
          <label htmlFor="cn-followup">Follow-up</label>
          <input id="cn-followup" className="cnotes-input" style={{ width:'100%' }}
            placeholder="e.g. After 7 days, After 2 weeks..." value={followUp}
            onChange={e => setFollowUp(e.target.value)} disabled={completed} />
        </div>

        {!completed && (
          <button id="cn-save-btn" type="submit" className="cnotes-save-btn" disabled={!diagnosis.trim()}>
            ✓ Save & Complete Consultation
          </button>
        )}
      </form>
    </div>
  )
}

export default ConsultationNotes
