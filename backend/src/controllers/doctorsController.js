const Doctor = require('../models/Doctor')
const {
  getSpecialtyForDisease,
  normalizeDiseaseName,
  normalizeSpecialty,
} = require('../config/diseaseSpecialtyMap')

const specialtyQuery = (specialty) => ({
  $or: [
    { specialty: normalizeSpecialty(specialty) },
    { specialty: new RegExp(normalizeSpecialty(specialty), 'i') },
  ]
})

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

const lookupDoctorsByDisease = async (diseaseName) => {
  return lookupDoctorsForTriage(null, diseaseName)
}

module.exports = {
  getDoctorsByDisease,
  lookupDoctorsByDisease,
  lookupDoctorsForTriage,
}
