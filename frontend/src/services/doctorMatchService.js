/**
 * Frontend helpers for specialty doctor lookup.
 * Prefer backend POST /api/consultations/match for assignment (fair + atomic).
 * These helpers remain for preview / legacy screens only.
 */
import { apiUrl } from './apiBase'
import doctorStatusService from '../doctor/services/doctorStatusService'

export function doctorRecordId(doc) {
  if (!doc) return null
  return doc.entry_id || doc.id || (doc._id ? String(doc._id) : null)
}

export function isActiveDoctorRecord(doc) {
  if (!doc) return false
  return doc.isActive === true
}

export function formatDoctorDisplayName(name) {
  const raw = String(name || '').trim()
  if (!raw) return 'Doctor'
  return raw.replace(/^(dr\.?\s*)+/i, '').trim() || raw
}

/**
 * Fetch doctors for a specialty without General Physician fallback.
 * GET /api/doctors/by-specialty/:specialty
 */
export async function fetchDoctorsBySpecialty(specialty) {
  const name = String(specialty || '').trim()
  if (!name) return []
  const res = await fetch(apiUrl(`/api/doctors/by-specialty/${encodeURIComponent(name)}`))
  const payload = await res.json().catch(() => ({}))
  if (!res.ok || !payload.success) {
    throw new Error(payload.message || 'Unable to load doctors for this specialty.')
  }
  return Array.isArray(payload.data?.doctors) ? payload.data.doctors : []
}

/**
 * Return the first active/available doctor from a list (preview only).
 */
export async function pickActiveDoctor(doctors) {
  const list = Array.isArray(doctors) ? doctors : []
  const localHit = list.find(isActiveDoctorRecord)
  if (localHit) return localHit
  for (const doc of list.slice(0, 15)) {
    const id = doctorRecordId(doc)
    if (!id) continue
    try {
      if (await doctorStatusService.get(String(id))) return doc
    } catch {}
  }
  return null
}

/**
 * Find an active doctor for the AI-recommended specialty (strict — no GP switch).
 * Prefer consultationService.matchRequest for real assignment.
 */
export async function findActiveDoctorForSpecialty(specialty) {
  const doctors = await fetchDoctorsBySpecialty(specialty)
  return pickActiveDoctor(doctors)
}
