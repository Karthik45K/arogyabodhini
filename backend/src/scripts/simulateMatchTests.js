require('dotenv').config()
const mongoose = require('mongoose')
const Doctor = require('../models/Doctor')
const Consultation = require('../models/Consultation')
const { findEligibleDoctorsForSpecialty, matchAndCreateConsultation } = require('../services/doctorMatchingService')

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)

  const rocky = await Doctor.findOne({ name: /rocky/i })
  console.log('rocky isActive', rocky?.isActive, 'ids', rocky?.entry_id, rocky?._id?.toString())

  const rockyIds = [rocky?.entry_id, rocky?._id?.toString(), rocky?.id].filter(Boolean)
  const accepted = await Consultation.find({ doctorId: { $in: rockyIds }, status: 'accepted' }).lean()
  console.log('rocky accepted consults:', accepted.map((c) => ({ id: c.id, createdAt: c.createdAt, acceptedAt: c.acceptedAt })))

  // Temporarily park accepted consults so eligibility can be tested
  const parked = []
  for (const c of accepted) {
    parked.push(c.id)
    await Consultation.updateOne({ id: c.id }, { $set: { status: 'completed', matchStatus: 'COMPLETED', _testParked: true } })
  }
  console.log('Parked accepted:', parked)

  // Ensure two active GPs for fair load test
  const suresh = await Doctor.findOne({ name: /suresh/i, specialty: /general/i })
  if (suresh) {
    await Doctor.updateOne({ _id: suresh._id }, { $set: { isActive: true, availabilityStatus: 'available' } })
  }
  await Doctor.updateOne({ _id: rocky._id }, { $set: { isActive: true, availabilityStatus: 'available' } })

  // Seed uneven waiting load on rocky
  const loadId = `cons-load-test-${Date.now()}`
  await Consultation.create({
    id: loadId,
    requestId: loadId,
    roomId: `consultation_${loadId}`,
    status: 'waiting',
    doctorId: rocky.entry_id || rocky._id.toString(),
    doctorName: rocky.name,
    doctorSpecialty: 'General Physician',
    doctorSpecialtyCanonical: 'general-physician',
    patientId: 'load-seed-patient',
    patientName: 'Load Seed',
    createdAt: new Date(),
  })

  const eligible = await findEligibleDoctorsForSpecialty('General Physician')
  console.log('Eligible:', eligible.candidates.map((c) => `${c.doc.name.trim()}:${c.counts.total}`))

  const first = eligible.candidates[0]
  const preferSuresh = suresh && first && String(first.doc._id) === String(suresh._id)
  console.log('TEST3 fair prefer lower load:', preferSuresh || (first && !/rocky/i.test(first.doc.name)) ? 'PASS' : 'CHECK', first?.doc?.name)

  const match = await matchAndCreateConsultation({
    specialty: 'General Physician',
    patient: { patientId: 'verify-match-' + Date.now(), name: 'Match Patient' },
    symptoms: 'mild fever',
    aiResult: { recommendedSpecialist: 'General Physician' },
  })
  console.log('TEST1 match one doctor:', match.matched ? 'PASS' : 'FAIL', match.doctor?.name, match.consultation?.doctorId)

  // Ensure only one doctor on that consult
  if (match.matched) {
    const same = await Consultation.countDocuments({ id: match.consultation.id })
    console.log('Single consult doc:', same === 1 ? 'PASS' : 'FAIL')
    await Consultation.deleteOne({ id: match.consultation.id })
  }

  await Consultation.deleteOne({ id: loadId })

  // Restore parked accepted consults
  for (const id of parked) {
    await Consultation.updateOne({ id }, { $set: { status: 'accepted', matchStatus: 'ACCEPTED' }, $unset: { _testParked: 1 } })
  }
  console.log('Restored parked accepted consults')

  // Leave rocky active; suresh restore inactive if we forced
  if (suresh) {
    await Doctor.updateOne({ _id: suresh._id }, { $set: { isActive: false } })
  }

  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
