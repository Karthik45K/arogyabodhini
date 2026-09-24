/**
 * One-shot / idempotent backfill: normalize doctor.specialty to canonical form
 * (e.g. "general physician" → "general-physician").
 *
 * Run: node src/scripts/normalizeDoctorSpecialties.js
 */
require('dotenv').config()
const connectDB = require('../config/db')
const { normalizeExistingDoctorSpecialties } = require('../controllers/doctorsController')

const run = async () => {
  await connectDB()
  const result = await normalizeExistingDoctorSpecialties()
  console.log(`[normalizeDoctorSpecialties] scanned=${result.scanned} updated=${result.updated}`)
  process.exit(0)
}

run().catch((err) => {
  console.error('[normalizeDoctorSpecialties] failed:', err)
  process.exit(1)
})
