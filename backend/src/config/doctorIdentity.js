const { DOCTORS } = require('../data/doctorsData')

const normalizeName = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

const seededDoctorByName = new Map(
  DOCTORS.map((doctor) => [normalizeName(doctor.name), doctor])
)

const isCanonicalDoctorId = (value) => /^doc-\d{3}$/i.test(String(value || ''))

const getCanonicalDoctorId = (doctor) => {
  const seededDoctor = seededDoctorByName.get(normalizeName(doctor?.name))
  if (seededDoctor) return seededDoctor.id

  if (isCanonicalDoctorId(doctor?.id)) return doctor.id
  return null
}

module.exports = { getCanonicalDoctorId, isCanonicalDoctorId }