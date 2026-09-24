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
  preferredLanguage: patient.preferredLanguage || '',
  createdAt: patient.createdAt,
})

const issueSession = (patient) => ({ token: signPatientToken(patient.patientId), patient: publicProfile(patient) })

const normalizeMobile = (phone) => String(phone || '').replace(/\D/g, '').slice(-10)

const normalizeEmail = (email) => String(email || '').trim().toLowerCase()

const continueWithPhone = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim()
    const phone = normalizeMobile(req.body.phone)
    const email = normalizeEmail(req.body.email)
    const preferredLanguage = String(req.body.preferredLanguage || '').trim()

    if (!name || phone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please enter your full name and a 10-digit mobile number.' })
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid email address is required for prescription delivery.' })
    }

    let patient = await Patient.findOne({
      $or: [
        { phone },
        { phone: `+91${phone}` },
        { phone: `+91 ${phone}` },
        { email },
      ],
    })

    if (!patient) {
      patient = await Patient.create({
        patientId: createPatientId(),
        name,
        phone,
        email,
        preferredLanguage,
        authMethod: 'phone',
        passwordHash: '',
      })
    } else {
      if (name) patient.name = name
      patient.phone = phone
      patient.email = email
      if (preferredLanguage) patient.preferredLanguage = preferredLanguage
      await patient.save()
    }

    const session = issueSession(patient)
    res.json({ success: true, ...session })
  } catch (error) {
    next(error)
  }
}

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
    const patient = await Patient.findOne({ $or: [{ email: normalized }, { phone: identifier }, { phone: identifier.replace(/\D/g, '').slice(-10) }] })
    if (!patient || !patient.passwordHash || !verifyPassword(password, patient.passwordHash)) {
      return res.status(401).json({ success: false, message: 'Invalid patient login details.' })
    }
    const session = await issueSession(patient)
    res.json({ success: true, ...session })
  } catch (error) {
    next(error)
  }
}

const getProfile = (req, res) => res.json({ success: true, patient: publicProfile(req.patient) })

const updateProfile = async (req, res, next) => {
  try {
    const patient = req.patient
    const email = String(req.body.email || '').trim().toLowerCase()
    const age = String(req.body.age || '').trim()
    const gender = String(req.body.gender || '').trim()
    const preferredLanguage = String(req.body.preferredLanguage || '').trim()
    const name = String(req.body.name || '').trim()
    const phone = String(req.body.phone || '').replace(/\D/g, '').slice(-10)

    if (email) {
      if (!email.includes('@')) {
        return res.status(400).json({ success: false, message: 'Enter a valid email address.' })
      }
      patient.email = email
    }
    if (name) patient.name = name
    if (phone.length === 10) patient.phone = phone
    if (age) patient.age = age
    if (gender) patient.gender = gender
    if (preferredLanguage) patient.preferredLanguage = preferredLanguage
    await patient.save()
    res.json({ success: true, patient: publicProfile(patient) })
  } catch (error) {
    next(error)
  }
}

const logoutPatient = async (req, res, next) => {
  try {
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}

module.exports = { getProfile, updateProfile, loginPatient, logoutPatient, registerPatient, continueWithPhone }