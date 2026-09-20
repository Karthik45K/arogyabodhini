const Doctor = require('../models/Doctor')
const { verifyPassword } = require('../services/doctorAuth')
const { getCanonicalDoctorId } = require('../config/doctorIdentity')
const { hashToken } = require('../middleware/doctorAuth')

const slugify = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

const toDoctorProfile = (doctor) => ({
  id: getCanonicalDoctorId(doctor) || doctor.id || doctor._id.toString(),
  name: doctor.name || 'Doctor',
  spec: doctor.specialty || doctor.spec || 'General Physician',
  regNo: doctor.entry_id ? `DB-${doctor.entry_id}` : `DB-${doctor._id.toString().slice(-8)}`,
  hospital: doctor.bangalore_location || doctor.location || '',
  initials: (doctor.name || 'Dr')
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase(),
  bgColor: '#1565c0',
  exp: doctor.experience || (doctor.experience_years ? `${doctor.experience_years} years` : ''),
  expYears: doctor.experience_years || 0,
  rating: doctor.rating || 0,
  reviews: doctor.reviews || 0,
  langs: doctor.languages || ['English'],
  fee: doctor.consultation_fee ? `₹${doctor.consultation_fee}` : 'Contact clinic',
  online: false,
  availStatus: doctor.availabilityStatus || 'unavailable',
  availLabel: doctor.availability || 'Not Available',
  phone: doctor.phone || '',
  about: doctor.bio || `${doctor.name || 'This doctor'} is a registered healthcare professional.`,
  specializations: doctor.treatments || [],
  education: doctor.degree ? [doctor.degree] : [],
  slots: doctor.slots || [],
})

const loginDoctor = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    const password = String(req.body.password || '')

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' })
    }

    const doctor = await Doctor.findOne({ email }).lean()
    if (!doctor || !verifyPassword(password, doctor.passwordHash)) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' })
    }

    const token = require('crypto').randomBytes(32).toString('hex')
    await Doctor.updateOne({ _id: doctor._id }, {
      $set: {
        sessionTokenHash: hashToken(token),
        sessionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    return res.json({
      success: true,
      token,
      doctor: {
        ...toDoctorProfile(doctor),
        email: doctor.email,
        loginAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { loginDoctor, toDoctorProfile, slugify }