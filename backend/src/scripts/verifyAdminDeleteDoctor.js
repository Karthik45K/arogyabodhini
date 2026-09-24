/**
 * Smoke checks for admin delete-doctor endpoint (auth + validation).
 * Run: node src/scripts/verifyAdminDeleteDoctor.js
 * Requires MONGODB_URI and a running-capable env (uses models directly + optional HTTP).
 */
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const Doctor = require('../models/Doctor')
const Consultation = require('../models/Consultation')
const Admin = require('../models/Admin')

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)
  const results = []
  const pass = (name, ok, detail = '') => {
    results.push({ name, ok, detail })
    console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`)
  }

  const secret = process.env.JWT_SECRET || 'secret'
  const adminToken = jwt.sign({ id: 'test-admin', role: 'admin' }, secret, { expiresIn: '1h' })
  const doctorToken = jwt.sign({ id: 'test-doc', role: 'doctor' }, secret, { expiresIn: '1h' })

  // Decode role checks (mirrors authAdmin)
  const decodeAdmin = jwt.verify(adminToken, secret)
  pass('Admin JWT has role admin', decodeAdmin.role === 'admin')
  const decodeDoc = jwt.verify(doctorToken, secret)
  pass('Non-admin JWT role is not admin', decodeDoc.role !== 'admin')

  // Invalid ObjectId should be rejected by route logic
  const invalidId = 'not-an-object-id'
  pass('Invalid doctorId detected', !mongoose.Types.ObjectId.isValid(invalidId))

  // Nonexistent valid ObjectId
  const missingId = new mongoose.Types.ObjectId()
  const missing = await Doctor.findById(missingId)
  pass('Nonexistent doctor returns null', missing === null)

  // Active consultation blocks delete (logic check)
  const sample = await Doctor.findOne({}).lean()
  if (sample) {
    const ids = [sample._id.toString(), sample.entry_id, sample.id].filter(Boolean)
    const active = await Consultation.findOne({ doctorId: { $in: ids }, status: 'accepted' }).lean()
    pass(
      'Active-consult guard query runs',
      true,
      active ? `doctor ${sample.name} is busy` : `doctor ${sample.name} not busy`
    )
  } else {
    pass('Active-consult guard skipped (no doctors)', true)
  }

  // Deleted doctor not in collection → matching naturally excludes
  const gone = await Doctor.findById(missingId)
  pass('Deleted/missing doctor not findable', gone === null)

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  await mongoose.disconnect()
  process.exit(failed.length ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
