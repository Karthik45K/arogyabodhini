const Doctor = require('../models/Doctor')
const {
  getSpecialtyForDisease,
  normalizeDiseaseName,
  normalizeSpecialty,
  normalizeDoctorSpecialty,
} = require('../config/diseaseSpecialtyMap')

/**
 * Match doctors by canonical specialty AND common raw variants
 * (spaces/underscores) so approved doctors with unnormalized specialty strings
 * are still found.
 */
const specialtyQuery = (specialty) => {
  const canonical = normalizeSpecialty(specialty)
  if (!canonical) return { specialty: { $exists: false } }

  const spaced = canonical.replace(/-/g, ' ')
  const underscored = canonical.replace(/-/g, '_')
  const escaped = canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const flexible = new RegExp(`^${escaped.replace(/-/g, '[-_\\s]+')}$`, 'i')

  return {
    $or: [
      { specialty: canonical },
      { specialty: spaced },
      { specialty: underscored },
      { specialty: new RegExp(`^${escaped}$`, 'i') },
      { specialty: flexible },
    ],
  }
}

/**
 * Persist canonical specialty on all doctor documents that need it.
 * Idempotent — safe to run repeatedly.
 */
const normalizeExistingDoctorSpecialties = async () => {
  const doctors = await Doctor.find({ specialty: { $exists: true, $ne: '' } })
    .select('_id specialty')
    .lean()
  let updated = 0
  for (const doctor of doctors) {
    const canonical = normalizeDoctorSpecialty(doctor.specialty)
    if (!canonical || canonical === doctor.specialty) continue
    await Doctor.updateOne({ _id: doctor._id }, { $set: { specialty: canonical } })
    updated += 1
  }
  return { scanned: doctors.length, updated }
}

const prioritizeSeedDoctors = (doctors) => [...doctors].sort((a, b) => {
  const aIsSeed = /^doc-\d+$/i.test(String(a.id || ''))
  const bIsSeed = /^doc-\d+$/i.test(String(b.id || ''))
  if (aIsSeed !== bIsSeed) return aIsSeed ? -1 : 1
  if (aIsSeed && bIsSeed) return String(a.id).localeCompare(String(b.id), undefined, { numeric: true })
  return 0
})

/** GET /api/doctors/by-disease/:disease */
const getDoctorsByDisease = async (req, res, next) => {
  try {
    const disease = normalizeDiseaseName(req.params.disease)

    if (!disease) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Disease name is required.',
      })
    }

    const specialty = getSpecialtyForDisease(disease) || 'general-physician'
    const doctors = prioritizeSeedDoctors(await Doctor.find(specialtyQuery(specialty)).lean())

    return res.status(200).json({
      success: true,
      data: {
        disease,
        specialty,
        doctors,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * Universal triage doctor lookup:
 * 1. Checks explicit recommendedSpecialty (e.g. "Cardiology" -> maps to "cardiologist")
 * 2. Checks disease condition mapping
 * 3. Falls back to regex query if needed
 * 4. Falls back to general-physician so patient is NEVER left with an empty screen
 */
const lookupDoctorsForTriage = async (specialtyName, diseaseName) => {
  let targetSpecialty = normalizeSpecialty(specialtyName)

  // If specialty was not directly mapped, try resolving disease name
  if (!targetSpecialty || targetSpecialty === 'general-physician') {
    const fromDisease = getSpecialtyForDisease(diseaseName)
    if (fromDisease) {
      targetSpecialty = fromDisease
    }
  }

  // 1. Direct query on target specialty
  let doctors = await Doctor.find(specialtyQuery(targetSpecialty)).lean()

  // 2. If no doctors found, try loose regex matching on specialty or bio/treatments
  if (!doctors.length && specialtyName) {
    const cleanWord = specialtyName.replace(/[^a-zA-Z]/g, '')
    if (cleanWord.length >= 4) {
      const rootRegex = new RegExp(cleanWord.slice(0, 5), 'i')
      doctors = await Doctor.find({
        $or: [
          { specialty: rootRegex },
          { treatments: rootRegex },
          { bio: rootRegex }
        ]
      }).lean()
    }
  }

  // 3. Fallback: If still no doctors found for a rare specialty, fetch general physicians
  if (!doctors.length) {
    doctors = await Doctor.find(specialtyQuery('general-physician')).lean()
  }

  return {
    found: doctors.length > 0,
    specialty: targetSpecialty,
    doctors: prioritizeSeedDoctors(doctors),
  }
}

/**
 * Strict specialty lookup for patient waiting/matching.
 * Does NOT fall back to General Physician when the specialty has no doctors online.
 */
const lookupDoctorsBySpecialtyStrict = async (specialtyName) => {
  const targetSpecialty = normalizeSpecialty(specialtyName)
  if (!specialtyName || !String(specialtyName).trim()) {
    return { found: false, specialty: targetSpecialty, doctors: [] }
  }

  let doctors = await Doctor.find(specialtyQuery(targetSpecialty)).lean()

  // Loose match only within the same specialty wording (still no GP fallback)
  if (!doctors.length) {
    const cleanWord = String(specialtyName).replace(/[^a-zA-Z]/g, '')
    if (cleanWord.length >= 4) {
      const rootRegex = new RegExp(cleanWord.slice(0, Math.min(8, cleanWord.length)), 'i')
      doctors = await Doctor.find({ specialty: rootRegex }).lean()
    }
  }

  return {
    found: doctors.length > 0,
    specialty: targetSpecialty,
    doctors: prioritizeSeedDoctors(doctors),
  }
}

/** GET /api/doctors/by-specialty/:specialty — no GP fallback */
const getDoctorsBySpecialty = async (req, res, next) => {
  try {
    const specialtyName = decodeURIComponent(String(req.params.specialty || '')).trim()
    if (!specialtyName) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Specialty name is required.',
      })
    }

    const lookup = await lookupDoctorsBySpecialtyStrict(specialtyName)
    return res.status(200).json({
      success: true,
      data: {
        specialty: lookup.specialty,
        requestedSpecialty: specialtyName,
        doctors: lookup.doctors,
      },
    })
  } catch (err) {
    next(err)
  }
}

const lookupDoctorsByDisease = async (diseaseName) => {
  return lookupDoctorsForTriage(null, diseaseName)
}

module.exports = {
  getDoctorsByDisease,
  getDoctorsBySpecialty,
  lookupDoctorsByDisease,
  lookupDoctorsForTriage,
  lookupDoctorsBySpecialtyStrict,
  normalizeExistingDoctorSpecialties,
  specialtyQuery,
}
