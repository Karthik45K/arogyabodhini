const crypto = require('crypto')
const Patient = require('../models/Patient')
const { hashPassword, verifyPassword } = require('../services/doctorAuth')
const { signPatientToken } = require('../config/patientJwt')

const createPatientId = () => `patient-${crypto.randomUUID()}`

const publicProfile = (patient) => ({
  patientId: patient.patientId,
  name: patient.name,
  age: patient.age || '',
  gender: patient.gender || '',
  phone: patient.phone,
  email: patient.email || '',
  createdAt: patient.createdAt,
})

const issueSession = (patient) => ({ token: signPatientToken(patient.patientId), patient: publicProfile(patient) })

const registerPatient = async (req, res, next) => {
  try {
    const { name, age, gender, phone, email, password, confirmPassword } = req.body
    const normalizedPhone = String(phone || '').trim()
    const normalizedEmail = String(email || '').trim().toLowerCase()
    if (!String(name || '').trim() || !normalizedPhone || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Name, mobile number, password, and confirmation are required.' })
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' })
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' })
    }
    const duplicate = await Patient.findOne({ $or: [
      { phone: normalizedPhone },
      ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
    ] })
    if (duplicate) return res.status(409).json({ success: false, message: 'An account already exists with that mobile number or email.' })

    const patientData = {
      patientId: createPatientId(), name: String(name).trim(), age: String(age || '').trim(),
      gender: String(gender || '').trim(), phone: normalizedPhone,
      passwordHash: hashPassword(String(password)),
    }
    if (normalizedEmail) patientData.email = normalizedEmail
    const patient = new Patient(patientData)
    await patient.save()
    const session = await issueSession(patient)
    res.status(201).json({ success: true, ...session })
  } catch (error) {
    next(error)
  }
}

const loginPatient = async (req, res, next) => {
  try {
    const identifier = String(req.body.identifier || '').trim()
    const password = String(req.body.password || '')
    if (!identifier || !password) return res.status(400).json({ success: false, message: 'Email or mobile number and password are required.' })
    const normalized = identifier.toLowerCase()
    const patient = await Patient.findOne({ $or: [{ email: normalized }, { phone: identifier }] })
    if (!patient || !verifyPassword(password, patient.passwordHash)) {
      return res.status(401).json({ success: false, message: 'Invalid patient login details.' })
    }
    const session = await issueSession(patient)
    res.json({ success: true, ...session })
  } catch (error) {
    next(error)
  }
}

const getProfile = (req, res) => res.json({ success: true, patient: publicProfile(req.patient) })

const logoutPatient = async (req, res, next) => {
  try {
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}

module.exports = { getProfile, loginPatient, logoutPatient, registerPatient }