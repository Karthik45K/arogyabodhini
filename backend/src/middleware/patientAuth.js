const jwt = require('jsonwebtoken')
const Patient = require('../models/Patient')
const { getPatientJwtSecret } = require('../config/patientJwt')

const getBearerToken = (req) => {
  const header = String(req.headers.authorization || '')
  return header.startsWith('Bearer ') ? header.slice(7).trim() : ''
}

const loadPatient = async (req) => {
  const token = getBearerToken(req)
  if (!token) return null
  try {
    const payload = jwt.verify(token, getPatientJwtSecret())
    if (payload.role !== 'patient' || !payload.sub) return null
    return Patient.findOne({ patientId: payload.sub })
  } catch {
    return null
  }
}

const requirePatient = async (req, res, next) => {
  try {
    const patient = await loadPatient(req)
    if (!patient) return res.status(401).json({ success: false, message: 'Invalid or expired patient token.' })
    req.patient = patient
    next()
  } catch (error) { next(error) }
}

const optionalPatient = async (req, res, next) => {
  try {
    const authorization = String(req.headers.authorization || '')
    if (authorization) {
      const patient = await loadPatient(req)
      if (!patient) return res.status(401).json({ success: false, message: 'Invalid or expired patient token.' })
      req.patient = patient
    } else {
      req.patient = null
    }
    next()
  } catch (error) { next(error) }
}

module.exports = { getBearerToken, loadPatient, optionalPatient, requirePatient }
