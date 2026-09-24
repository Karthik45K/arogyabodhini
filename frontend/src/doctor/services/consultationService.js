/**
 * consultationService.js
 * Manages consultation requests via the backend REST API.
 * Acts as the bridge between Patient UI and Doctor Dashboard.
 *
 * All data flows through the Express backend (/api/consultations)
 * so requests work CROSS-BROWSER and CROSS-DEVICE.
 *
 * The interface stays identical to the original localStorage version
 * so no changes are needed in DoctorDashboard.jsx or AppointmentScreen.jsx.
 *
 * Methods return Promises (async) — callers that previously used synchronous
 * returns are updated to handle async via .then() or await.
 */

import { apiUrl } from '../../services/apiBase'
import patientService from '../../patient/services/patientService'

const API = apiUrl('/api/consultations')
const patientHeaders = () => {
  const token = patientService.getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
const doctorHeaders = () => {
  const token = localStorage.getItem('ab_doctor_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}
const consultationHeaders = (viewer) => viewer === 'patient' ? patientHeaders() : doctorHeaders()

const responseError = async (res, fallbackMessage) => {
  let data = {}
  try { data = await res.json() } catch {}
  const error = new Error(data.message || fallbackMessage)
  error.status = res.status
  return error
}

export const consultationService = {

  /**
   * Backend fair match + create consultation for recommended specialty.
   * Does not switch specialty when no doctor is available.
   */
  async matchRequest({
    specialty,
    patientAge,
    patientGender,
    patientLang,
    patientSymptoms,
    symptoms,
    aiResult,
    slot,
    consultationType,
  }) {
    if (!patientService.getToken()) {
      const error = new Error('Please log in to request a video consultation.')
      error.status = 401
      throw error
    }
    const res = await fetch(`${API}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...patientHeaders() },
      body: JSON.stringify({
        specialty,
        patientAge,
        patientGender,
        patientLang,
        patientSymptoms,
        symptoms,
        aiResult,
        slot,
        consultationType,
      }),
    })
    if (!res.ok) throw await responseError(res, 'Failed to match a doctor.')
    const data = await res.json()
    if (!data.success) throw new Error(data.message || 'Failed to match a doctor.')
    return data
  },

  /** Create a new consultation request (called from Patient AppointmentScreen) */
  async createRequest({ doctorId, doctorName, doctorSpecialty, patientName, patientAge, patientGender, patientLang, patientPhone, patientContact, patientSymptoms, symptoms, aiResult, slot, consultationType }) {
    if (!patientService.getToken()) {
      const error = new Error('Please log in to request a video consultation.')
      error.status = 401
      throw error
    }
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...patientHeaders() },
      body: JSON.stringify({ doctorId, doctorName, doctorSpecialty, patientName, patientAge, patientGender, patientLang, patientPhone, patientContact, patientSymptoms, symptoms, aiResult, slot, consultationType }),
    })
    if (!res.ok) throw await responseError(res, 'Failed to create consultation request.')
    const data = await res.json()
    if (!data.success) throw new Error(data.message || 'Failed to create consultation request.')
    return data.consultation
  },

  /** Get all consultations for a doctor */
  async getByDoctor(doctorId) {
    const headers = doctorHeaders()
    if (!headers.Authorization) {
      const error = new Error('Doctor authentication is required.')
      error.status = 401
      throw error
    }
    const res = await fetch(`${API}?doctorId=${encodeURIComponent(doctorId)}`, { headers })
    if (!res.ok) throw await responseError(res, 'Unable to load consultation requests.')
    const data = await res.json()
    return data.success ? data.consultations : []
  },

  /** Get a single consultation */
  async getById(id, viewer = 'doctor') {
    const headers = consultationHeaders(viewer)
    if (viewer === 'patient' && !headers.Authorization) {
      const error = new Error('Patient authentication is required.')
      error.status = 401
      throw error
    }
    const res = await fetch(`${API}/${encodeURIComponent(id)}`, { headers })
    if (!res.ok) throw await responseError(res, 'Unable to load consultation.')
    const data = await res.json()
    return data.success ? data.consultation : null
  },

  /** Accept a consultation request */
  async accept(id) {
    const res = await fetch(`${API}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...doctorHeaders() },
      body: JSON.stringify({ status: 'accepted' }),
    })
    const data = await res.json()
    return data.success ? data.consultation : null
  },

  /** Reject a consultation request */
  async reject(id) {
    const res = await fetch(`${API}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...doctorHeaders() },
      body: JSON.stringify({ status: 'rejected' }),
    })
    const data = await res.json()
    return data.success ? data.consultation : null
  },

  /** Save consultation notes + mark completed */
  async saveNotes(id, notes) {
    const res = await fetch(`${API}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...doctorHeaders() },
      body: JSON.stringify({ status: 'completed', notes }),
    })
    const data = await res.json()
    return data.success ? data.consultation : null
  },

  /** Save prescription (signed). Does not auto-send unless deliveryChannels provided. */
  async savePrescription(id, prescription) {
    const res = await fetch(`${API}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...doctorHeaders() },
      body: JSON.stringify({ prescription }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.message || 'Unable to save prescription.')
    return data.consultation
  },

  /** Deliver canonical signed prescription via selected channels */
  async deliverPrescription(id, channels) {
    const res = await fetch(`${API}/${encodeURIComponent(id)}/deliver-prescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...doctorHeaders() },
      body: JSON.stringify({ channels }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.message || 'Unable to deliver prescription.')
    return data
  },

  async endCall(id, endedBy, viewer = 'doctor') {
    const headers = consultationHeaders(viewer)
    if (!headers.Authorization) return null
    const res = await fetch(`${API}/${encodeURIComponent(id)}/end-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ endedBy }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.success ? data.consultation : null
  },

  /** Clear all (for testing) */
  async clear() {
    await fetch(API, { method: 'DELETE' })
  },
}

export default consultationService
