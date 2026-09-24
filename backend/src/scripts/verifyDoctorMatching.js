/**
 * Integration checks for fair doctor matching (requires MongoDB).
 * Run: node src/scripts/verifyDoctorMatching.js
 */
require('dotenv').config()
const mongoose = require('mongoose')
const Doctor = require('../models/Doctor')
const Consultation = require('../models/Consultation')
const {
  findEligibleDoctorsForSpecialty,
  matchAndCreateConsultation,
} = require('../services/doctorMatchingService')
const { toMajorSpecialty } = require('../config/majorSpecialties')

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)
  const results = []

  const pass = (name, ok, detail = '') => {
    results.push({ name, ok, detail })
    console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`)
  }

  // Specialty clamp
  pass('Cardiology clamps to cardiologist', toMajorSpecialty('Cardiology').canonical === 'cardiologist')
  pass('GP clamp', toMajorSpecialty('General Medicine').canonical === 'general-physician')

  // Find GP doctors
  const gp = await findEligibleDoctorsForSpecialty('General Physician')
  pass('GP specialty label', gp.specialtyLabel === 'General Physician', gp.specialtyLabel)
  pass(
    'Eligible GP list excludes inactive',
    gp.candidates.every((c) => c.doc.isActive === true),
    `count=${gp.candidates.length}`
  )

  const inactiveGp = await Doctor.find({
    specialty: { $in: ['general-physician', 'general physician', 'General Physician'] },
    isActive: { $ne: true },
  }).limit(3).lean()
  pass(
    'Inactive GP not in eligible list',
    inactiveGp.every((d) => !gp.candidates.some((c) => String(c.doc._id) === String(d._id))),
    `inactiveSample=${inactiveGp.length}`
  )

  // Cardiology wait (no silent specialty switch)
  const cardio = await findEligibleDoctorsForSpecialty('Cardiology')
  pass('Cardiology label preserved', cardio.specialtyLabel === 'Cardiology')
  if (!cardio.candidates.length) {
    const fakePatient = { patientId: 'test-patient-match-verify', name: 'Verify Patient', phone: '' }
    const match = await matchAndCreateConsultation({
      specialty: 'Cardiology',
      patient: fakePatient,
      patientSymptoms: 'chest pain',
      symptoms: 'chest pain',
      aiResult: { recommendedSpecialist: 'Cardiology' },
    })
    pass(
      'No cardiologist → wait, no unrelated assign',
      match.matched === false && match.specialtyLabel === 'Cardiology',
      match.message
    )
  } else {
    pass('Cardiology has eligible doctors (skip empty wait test)', true, `n=${cardio.candidates.length}`)
  }

  // Fair workload: if 2+ eligible same specialty, lowest load first
  if (gp.candidates.length >= 2) {
    const a = gp.candidates[0]
    const b = gp.candidates[1]
    pass(
      'Fair sort: first has load <= second',
      a.counts.total <= b.counts.total,
      `${a.doc.name}:${a.counts.total} vs ${b.doc.name}:${b.counts.total}`
    )
  } else {
    pass('Fair sort skipped (<2 eligible GPs)', true, `n=${gp.candidates.length}`)
  }

  // Busy exclusion
  const busyAccepted = await Consultation.findOne({ status: 'accepted' }).sort({ createdAt: -1 }).lean()
  if (busyAccepted?.doctorId) {
    const allGpIds = gp.candidates.flatMap((c) => [
      c.doc.entry_id,
      c.doc.id,
      c.doc._id?.toString(),
    ])
    const busyInEligible = allGpIds.includes(busyAccepted.doctorId)
    pass('Busy (accepted) doctor not eligible for new match', !busyInEligible, busyAccepted.doctorId)
  } else {
    pass('Busy exclusion skipped (no accepted consult)', true)
  }

  console.log('\n--- Summary ---')
  const failed = results.filter((r) => !r.ok)
  console.log(`Passed ${results.length - failed.length}/${results.length}`)
  if (failed.length) process.exitCode = 1
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
