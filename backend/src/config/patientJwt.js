const jwt = require('jsonwebtoken')

const getPatientJwtSecret = () => {
  const secret = String(process.env.PATIENT_JWT_SECRET || '').trim()
  if (!secret) throw new Error('PATIENT_JWT_SECRET is not configured.')
  return secret
}

const signPatientToken = (patientId) => jwt.sign(
  { sub: patientId, role: 'patient' },
  getPatientJwtSecret(),
  { expiresIn: '7d' }
)

module.exports = { getPatientJwtSecret, signPatientToken }