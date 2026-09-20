/**
 * seedDatabase.js
 * ----------------
 * Seeds MongoDB with doctor profiles from doctorsData.js.
 *
 * Run: node src/scripts/seedDatabase.js
 */

require('dotenv').config()
const mongoose = require('mongoose')
const { DOCTORS } = require('../data/doctorsData')
const { normalizeDoctorSpecialty } = require('../config/diseaseSpecialtyMap')

// --- Models ------------------------------------------------------------------

const Doctor = mongoose.model(
  'Doctor',
  new mongoose.Schema({}, { collection: 'doctors', strict: false })
)

const seededDoctors = DOCTORS.map((doctor) => ({
  ...doctor,
  specialty: normalizeDoctorSpecialty(doctor.specialty),
}))

// --- Seeder ------------------------------------------------------------------

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'arogyabodhini' })
  console.log('Connected to MongoDB')

  await Doctor.deleteMany({})
  await Doctor.insertMany(seededDoctors)
  console.log('Seeded', seededDoctors.length, 'doctor records')

  await mongoose.disconnect()
  console.log('Done.')
}

seed().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
