const crypto = require('crypto')
const Doctor = require('../models/Doctor')
const { getCanonicalDoctorId } = require('../config/doctorIdentity')

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

const getBearerToken = (req) => {
  const header = String(req.headers.authorization || '')
  return header.startsWith('Bearer ') ? header.slice(7).trim() : ''
}

const loadDoctor = async (req) => {
  const token = getBearerToken(req)
  if (!token) return null
  const doctor = await Doctor.findOne({
    sessionTokenHash: hashToken(token),
    sessionExpiresAt: { $gt: new Date() },
  }).lean()
  if (!doctor) return null
  return { ...doctor, id: getCanonicalDoctorId(doctor) || doctor.id || doctor._id.toString() }
}

const requireDoctor = async (req, res, next) => {
  try {
    const doctor = await loadDoctor(req)
    if (!doctor) return res.status(401).json({ success: false, message: 'Doctor login is required.' })
    req.doctor = doctor
    next()
  } catch (error) { next(error) }
}

module.exports = { getBearerToken, hashToken, loadDoctor, requireDoctor }