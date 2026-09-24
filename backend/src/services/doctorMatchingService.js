/**
 * Backend doctor matching: eligibility + fair workload selection + consult create.
 * Source of truth = MongoDB Doctor + Consultation collections.
 */
const Doctor = require('../models/Doctor')
const Consultation = require('../models/Consultation')
const mongoose = require('mongoose')
const { specialtyQuery } = require('../controllers/doctorsController')
const { toMajorSpecialty, labelForCanonical } = require('../config/majorSpecialties')
const { normalizeSpecialty } = require('../config/diseaseSpecialtyMap')
const crypto = require('crypto')

const ACTIVE_BUSY_STATUSES = ['accepted']
const LOAD_STATUSES = ['waiting', 'accepted']
const FRESH_MS = 45 * 60 * 1000

function uuid() {
  return `cons-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function doctorIdsOf(doctor) {
  return [doctor.entry_id, doctor.id, doctor._id?.toString()].filter(Boolean)
}

/** Accepting video = doctor explicitly Active (dashboard toggle). */
function isAcceptingVideo(doctor) {
  return doctor?.isActive === true
}

async function loadCountsByDoctor(doctorIdList) {
  if (!doctorIdList.length) return new Map()
  const since = new Date(Date.now() - FRESH_MS)
  const rows = await Consultation.aggregate([
    {
      $match: {
        doctorId: { $in: doctorIdList },
        status: { $in: LOAD_STATUSES },
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: '$doctorId',
        waiting: { $sum: { $cond: [{ $eq: ['$status', 'waiting'] }, 1, 0] } },
        accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
        total: { $sum: 1 },
      },
    },
  ])
  const map = new Map()
  for (const row of rows) {
    map.set(String(row._id), {
      waiting: row.waiting || 0,
      accepted: row.accepted || 0,
      total: row.total || 0,
    })
  }
  return map
}

function countForDoctor(doctor, countMap) {
  let waiting = 0
  let accepted = 0
  for (const id of doctorIdsOf(doctor)) {
    const c = countMap.get(String(id))
    if (!c) continue
    waiting += c.waiting
    accepted += c.accepted
  }
  return { waiting, accepted, total: waiting + accepted }
}

/**
 * Eligible = in Doctor collection (admin-approved),
 * correct specialty, Active + accepting video, not busy (no accepted consult).
 */
function isEligibleDoctor(doctor, counts) {
  if (!doctor) return false
  if (!isAcceptingVideo(doctor)) return false
  if ((counts?.accepted || 0) > 0) return false
  return true
}

async function findEligibleDoctorsForSpecialty(specialtyInput) {
  const major = toMajorSpecialty(specialtyInput)
  const doctors = await Doctor.find(specialtyQuery(major.canonical)).lean()
  const allIds = doctors.flatMap(doctorIdsOf)
  const countMap = await loadCountsByDoctor([...new Set(allIds)])

  const scored = doctors.map((doc) => {
    const counts = countForDoctor(doc, countMap)
    return { doc, counts, eligible: isEligibleDoctor(doc, counts) }
  }).filter((row) => row.eligible)

  // Fair sort: fewer waiting+accepted first; then older lastAssignedAt; then stable _id
  scored.sort((a, b) => {
    if (a.counts.total !== b.counts.total) return a.counts.total - b.counts.total
    const aAssigned = a.doc.lastAssignedAt ? new Date(a.doc.lastAssignedAt).getTime() : 0
    const bAssigned = b.doc.lastAssignedAt ? new Date(b.doc.lastAssignedAt).getTime() : 0
    if (aAssigned !== bAssigned) return aAssigned - bAssigned
    return String(a.doc._id).localeCompare(String(b.doc._id))
  })

  return {
    specialtyCanonical: major.canonical,
    specialtyLabel: major.label,
    fellBackToGp: major.fellBackToGp,
    candidates: scored,
  }
}

/**
 * Atomic claim: only succeeds while doctor is still Active.
 * lastAssignToken + lastAssignedAt support fair round-robin tie-break.
 */
async function claimDoctorForAssignment(doctor) {
  return Doctor.findOneAndUpdate(
    { _id: doctor._id, isActive: true },
    {
      $set: {
        lastAssignedAt: new Date(),
        lastAssignToken: crypto.randomBytes(8).toString('hex'),
      },
    },
    { returnDocument: 'after' }
  ).lean()
}

async function doctorHasAcceptedConsult(doctor) {
  const ids = doctorIdsOf(doctor)
  if (!ids.length) return true
  const since = new Date(Date.now() - FRESH_MS)
  const busy = await Consultation.countDocuments({
    doctorId: { $in: ids },
    status: { $in: ACTIVE_BUSY_STATUSES },
    $or: [
      { acceptedAt: { $gte: since } },
      { createdAt: { $gte: since } },
    ],
  })
  return busy > 0
}

/**
 * Atomically pick one eligible doctor and create a consultation.
 * Retries other candidates if claim fails or doctor becomes busy.
 * Does NOT fall back to another specialty.
 */
async function matchAndCreateConsultation({
  specialty,
  patient,
  patientAge,
  patientGender,
  patientLang,
  patientSymptoms,
  symptoms,
  aiResult,
  slot,
  consultationType,
  patientEmail,
}) {
  const { specialtyCanonical, specialtyLabel, candidates } = await findEligibleDoctorsForSpecialty(specialty)

  // Reuse an existing open request for this patient + specialty (prevents poll duplicates)
  const since = new Date(Date.now() - FRESH_MS)
  const existing = await Consultation.findOne({
    patientId: patient.patientId,
    status: 'waiting',
    createdAt: { $gte: since },
    $or: [
      { doctorSpecialtyCanonical: specialtyCanonical },
      { doctorSpecialty: specialtyLabel },
      { 'aiResult.recommendedSpecialist': specialtyLabel },
    ],
  }).sort({ createdAt: -1 }).lean()

  if (existing?.doctorId) {
    // If assigned doctor was deleted, release so matching can find another eligible doctor
    const stillExists = await Doctor.findOne({
      $or: [
        { entry_id: existing.doctorId },
        { id: existing.doctorId },
        ...(mongoose.Types.ObjectId.isValid(existing.doctorId)
          ? [{ _id: existing.doctorId }]
          : []),
      ],
    }).select('_id').lean()

    if (stillExists) {
      return {
        matched: true,
        matchStatus: 'WAITING_FOR_DOCTOR',
        specialtyCanonical,
        specialtyLabel,
        doctor: {
          id: existing.doctorId,
          name: existing.doctorName,
          specialty: existing.doctorSpecialty || specialtyLabel,
          specialtyLabel,
        },
        consultation: existing,
        message: `${existing.doctorName || 'Doctor'} is available. Request sent.`,
      }
    }

    await Consultation.updateOne(
      { _id: existing._id },
      { $set: { matchStatus: 'SEARCHING', doctorName: '' }, $unset: { doctorId: 1 } }
    )
  }

  if (!candidates.length) {
    return {
      matched: false,
      matchStatus: 'SEARCHING',
      specialtyCanonical,
      specialtyLabel,
      message: `Waiting for a ${specialtyLabel} doctor to become available.`,
    }
  }

  for (const { doc } of candidates) {
    if (await doctorHasAcceptedConsult(doc)) continue

    const claimed = await claimDoctorForAssignment(doc)
    if (!claimed) continue

    // Re-check busy after claim (race with another accept)
    if (await doctorHasAcceptedConsult(claimed)) continue

    const canonicalDoctorId = claimed.entry_id || claimed.id || claimed._id.toString()
    const id = uuid()
    const consultation = await Consultation.create({
      id,
      requestId: id,
      roomId: `consultation_${id}`,
      status: 'waiting',
      matchStatus: 'MATCHED',
      doctorId: canonicalDoctorId,
      doctorName: claimed.name || '',
      doctorSpecialty: specialtyLabel,
      doctorSpecialtyCanonical: specialtyCanonical,
      patientId: patient.patientId,
      patientName: patient.name || '',
      patientAge: patientAge || patient.age || '',
      patientGender: patientGender || patient.gender || '',
      patientLang: patientLang || 'English',
      patientPhone: patient.phone || '',
      patientContact: patient.phone || '',
      patientEmail: patientEmail || patient.email || '',
      patientSymptoms: patientSymptoms || symptoms || '',
      symptoms: symptoms || patientSymptoms || '',
      aiResult: aiResult || null,
      slot: slot || 'Instant Video Call',
      consultationType: consultationType || 'video',
      createdAt: new Date(),
      notes: null,
      prescription: null,
    })

    return {
      matched: true,
      matchStatus: 'WAITING_FOR_DOCTOR',
      specialtyCanonical,
      specialtyLabel,
      doctor: {
        id: canonicalDoctorId,
        name: claimed.name,
        specialty: claimed.specialty,
        specialtyLabel,
        isActive: claimed.isActive === true,
      },
      consultation: consultation.toObject(),
      message: `${claimed.name || 'Doctor'} is available. Request sent.`,
    }
  }

  return {
    matched: false,
    matchStatus: 'SEARCHING',
    specialtyCanonical,
    specialtyLabel,
    message: `Waiting for a ${specialtyLabel} doctor to become available.`,
  }
}

module.exports = {
  findEligibleDoctorsForSpecialty,
  matchAndCreateConsultation,
  isEligibleDoctor,
  toMajorSpecialty,
  labelForCanonical,
  normalizeSpecialty,
}
