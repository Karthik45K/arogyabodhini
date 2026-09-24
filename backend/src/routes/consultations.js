const express = require('express')
const Consultation = require('../models/Consultation')
const Doctor = require('../models/Doctor')
const router = express.Router()

const { loadPatient, requirePatient } = require('../middleware/patientAuth')
const { loadDoctor, requireDoctor } = require('../middleware/doctorAuth')

const Prescription = require('../models/Prescription')
const { sendPrescriptionEmail, isSmtpConfigured, isEmailConfigured } = require('../services/emailService')
const { sendPrescriptionSMS } = require('../services/smsService')
const { sendPrescriptionWhatsApp, isWhatsAppConfigured, ensureAccessToken } = require('../services/twilioDeliveryService')
const { buildPrescriptionPdfBuffer } = require('../services/prescriptionPdfService')
const { signPrescription, verifyPrescription } = require('../services/prescriptionSigner')
const crypto = require('crypto')

const requireConsultationViewer = async (req, res, next) => {
  try {
    if (!req.headers.authorization) return res.status(401).json({ success: false, message: 'Authentication is required.' })
    const [patient, doctor] = await Promise.all([loadPatient(req), loadDoctor(req)])
    if (!patient && !doctor) return res.status(401).json({ success: false, message: 'Invalid or expired session.' })
    req.patient = patient
    req.doctor = doctor
    next()
  } catch (error) { next(error) }
}

const requireDoctorMutation = async (req, res, next) => {
  try {
    const doctor = await loadDoctor(req)
    if (doctor) {
      req.doctor = doctor
      return next()
    }
    if (req.headers.authorization && await loadPatient(req)) {
      return res.status(403).json({ success: false, message: 'Patients cannot modify consultations.' })
    }
    return res.status(401).json({ success: false, message: 'Doctor login is required.' })
  } catch (error) { next(error) }
}

function uuid() {
  return `cons-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

const { matchAndCreateConsultation } = require('../services/doctorMatchingService')
const { toMajorSpecialty } = require('../config/majorSpecialties')

/**
 * POST /api/consultations/match
 * Backend-authoritative fair specialty match + single-doctor assignment.
 * Does not switch specialty when no doctor is available.
 */
router.post('/consultations/match', requirePatient, async (req, res, next) => {
  try {
    const {
      specialty,
      patientAge,
      patientGender,
      patientLang,
      patientSymptoms,
      symptoms,
      aiResult,
      slot,
      consultationType,
      patientEmail: bodyEmail,
    } = req.body

    const specialtyInput =
      specialty ||
      aiResult?.recommendedSpecialist ||
      aiResult?.recommendedSpecialty ||
      ''

    if (!specialtyInput || !String(specialtyInput).trim()) {
      return res.status(400).json({
        success: false,
        message: 'specialty (recommended specialist) is required.',
      })
    }

    const major = toMajorSpecialty(specialtyInput)

    let resolvedEmail = bodyEmail || req.patient?.email || ''
    if (!resolvedEmail && req.patient?.patientId) {
      const Patient = require('../models/Patient')
      const patDoc = await Patient.findOne({ patientId: req.patient.patientId }).lean()
      if (patDoc?.email) resolvedEmail = patDoc.email
    }

    const result = await matchAndCreateConsultation({
      specialty: major.canonical,
      patient: req.patient,
      patientAge,
      patientGender,
      patientLang,
      patientSymptoms,
      symptoms,
      aiResult: aiResult
        ? {
            ...aiResult,
            recommendedSpecialist: major.label,
            recommendedSpecialty: major.label,
          }
        : { recommendedSpecialist: major.label },
      slot,
      consultationType: consultationType || 'video',
      patientEmail: resolvedEmail,
    })

    if (!result.matched) {
      return res.status(200).json({
        success: true,
        matched: false,
        matchStatus: result.matchStatus || 'SEARCHING',
        specialtyCanonical: result.specialtyCanonical,
        specialtyLabel: result.specialtyLabel,
        message: result.message,
        consultation: null,
        doctor: null,
      })
    }

    return res.status(201).json({
      success: true,
      matched: true,
      matchStatus: result.matchStatus || 'WAITING_FOR_DOCTOR',
      specialtyCanonical: result.specialtyCanonical,
      specialtyLabel: result.specialtyLabel,
      message: result.message,
      doctor: result.doctor,
      consultation: result.consultation,
    })
  } catch (error) {
    next(error)
  }
})

router.post('/consultations', requirePatient, async (req, res, next) => {
  try {
    const {
      doctorId, doctorName, doctorSpecialty, patientName, patientAge, patientGender,
      patientLang, patientPhone, patientContact, patientEmail: bodyEmail, patientSymptoms, symptoms, aiResult, slot, consultationType,
    } = req.body
    if (!doctorId || !patientName) {
      return res.status(400).json({ success: false, message: 'doctorId and patientName are required.' })
    }

    const mongoose = require('mongoose')
    const queryConditions = [{ entry_id: doctorId }, { id: doctorId }]
    if (mongoose.Types.ObjectId.isValid(doctorId)) {
      queryConditions.push({ _id: doctorId })
    }

    const doctor = await Doctor.findOne({ $or: queryConditions }).lean()
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' })
    }

    const canonicalDoctorId = doctor.entry_id || doctor.id || doctor._id.toString()

    let resolvedEmail = bodyEmail || req.patient?.email || ''
    if (!resolvedEmail && req.patient?.patientId) {
      const Patient = require('../models/Patient')
      const patDoc = await Patient.findOne({ patientId: req.patient.patientId }).lean()
      if (patDoc?.email) resolvedEmail = patDoc.email
    }

    const id = uuid()
    const consultation = await Consultation.create({
      id, requestId: id, roomId: `consultation_${id}`, status: 'waiting', doctorId: canonicalDoctorId,
      doctorName: doctorName || '', doctorSpecialty: doctorSpecialty || '',
      patientId: req.patient.patientId,
      patientName: req.patient.name || patientName,
      patientAge: patientAge || req.patient.age || '',
      patientGender: patientGender || req.patient.gender || '',
      patientLang: patientLang || 'English',
      patientPhone: req.patient.phone || patientPhone || '',
      patientContact: req.patient.phone || patientContact || patientPhone || '',
      patientEmail: resolvedEmail || req.patient.email || '',
      patientSymptoms: patientSymptoms || symptoms || '', symptoms: symptoms || patientSymptoms || '',
      aiResult: aiResult || null, slot: slot || '', consultationType: consultationType || 'in_person',
      createdAt: new Date(), notes: null, prescription: null,
    })
    console.log(`[consultations] Created: ${consultation.id} for doctor ${doctorId} (patient: ${patientName})`)
    res.status(201).json({ success: true, consultation: consultation.toObject() })
  } catch (error) { next(error) }
})

router.get('/consultations', requireDoctor, async (req, res, next) => {
  try {
    const doctorIds = [req.doctor.id, req.doctor._id?.toString(), req.doctor.entry_id, req.query.doctorId].filter(Boolean)
    const consultations = await Consultation.find({ doctorId: { $in: doctorIds } }).sort({ createdAt: -1 }).lean()
    res.json({ success: true, consultations })
  } catch (error) { next(error) }
})

router.get('/consultations/:id', requireConsultationViewer, async (req, res, next) => {
  try {
    const consultation = await Consultation.findOne({ id: req.params.id }).lean()
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found.' })
    const ownsAsPatient = req.patient && consultation.patientId === req.patient.patientId
    const doctorIds = req.doctor ? [req.doctor.id, req.doctor._id?.toString(), req.doctor.entry_id].filter(Boolean) : []
    const ownsAsDoctor = doctorIds.includes(consultation.doctorId)
    if (!ownsAsPatient && !ownsAsDoctor) return res.status(403).json({ success: false, message: 'You are not authorized to access this consultation.' })
    res.json({ success: true, consultation })
  } catch (error) { next(error) }
})

router.post('/consultations/:id/end-call', requireConsultationViewer, async (req, res, next) => {
  try {
    const consultation = await Consultation.findOne({ id: req.params.id })
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found.' })
    const ownsAsPatient = req.patient && consultation.patientId === req.patient.patientId
    const doctorIds = req.doctor ? [req.doctor.id, req.doctor._id?.toString(), req.doctor.entry_id].filter(Boolean) : []
    const ownsAsDoctor = doctorIds.includes(consultation.doctorId)
    if (!ownsAsPatient && !ownsAsDoctor) {
      return res.status(403).json({ success: false, message: 'You are not authorized to end this consultation.' })
    }

    const roleEndedBy = ownsAsDoctor && !ownsAsPatient
      ? 'doctor'
      : ownsAsPatient && !ownsAsDoctor
        ? 'patient'
        : (req.body.endedBy === 'patient' ? 'patient' : 'doctor')

    if (consultation.callStatus === 'ended') {
      return res.json({ success: true, alreadyEnded: true, consultation: consultation.toObject() })
    }

    consultation.callStatus = 'ended'
    consultation.callEndedAt = new Date()
    consultation.callEndedBy = roleEndedBy
    await consultation.save()
    res.json({ success: true, consultation: consultation.toObject() })
  } catch (error) { next(error) }
})

router.patch('/consultations/:id', requireDoctorMutation, async (req, res, next) => {
  try {
    const consultation = await Consultation.findOne({ id: req.params.id })
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found.' })
    const doctorIds = [req.doctor.id, req.doctor._id?.toString(), req.doctor.entry_id].filter(Boolean)
    if (!doctorIds.includes(consultation.doctorId)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to modify this consultation.' })
    }

    const { status, notes, prescription } = req.body
    if (status === 'accepted') {
      // One active consultation per doctor — refuse if already in an accepted call
      const doctorIdVariants = [consultation.doctorId, ...doctorIds].filter(Boolean)
      const since = new Date(Date.now() - 45 * 60 * 1000)
      const otherActive = await Consultation.countDocuments({
        id: { $ne: consultation.id },
        doctorId: { $in: [...new Set(doctorIdVariants)] },
        status: 'accepted',
        $or: [
          { acceptedAt: { $gte: since } },
          { createdAt: { $gte: since } },
        ],
      })
      if (otherActive > 0) {
        return res.status(409).json({
          success: false,
          message: 'Doctor is already handling an active consultation.',
        })
      }
      consultation.status = 'accepted'
      consultation.matchStatus = 'ACCEPTED'
      consultation.acceptedAt = new Date()
    } else if (status === 'rejected') {
      consultation.status = 'rejected'
      consultation.matchStatus = 'REJECTED'
    } else if (status === 'completed' || notes || prescription) {
      if (notes) consultation.notes = notes
      consultation.status = 'completed'
      consultation.matchStatus = 'COMPLETED'
      consultation.completedAt = new Date()
    }
    
    if (prescription) {
      if (!req.doctor) {
        return res.status(403).json({ success: false, message: 'Only an authenticated doctor can issue a prescription.' })
      }

      const prescriptionId = `rx-${crypto.randomUUID()}`
      const issuedAt = new Date().toISOString()
      const doctorLicense = req.doctor.registrationNumber || req.doctor.licenseNumber || req.doctor.regNo || `DEMO-REG-${String(req.doctor.id || '').slice(-8)}`
      const licenseIsDemo = !(req.doctor.registrationNumber || req.doctor.licenseNumber)

      let recipientEmail = consultation.patientEmail
      let recipientPhone = consultation.patientPhone || consultation.patientContact || ''
      if (consultation.patientId) {
        const Patient = require('../models/Patient')
        const patDoc = await Patient.findOne({ patientId: consultation.patientId }).lean()
        if (patDoc?.email && !recipientEmail) recipientEmail = patDoc.email
        if (patDoc?.phone && !recipientPhone) recipientPhone = patDoc.phone
      }

      const medicines = prescription.medicines || []
      const signedFields = {
        prescriptionId,
        consultationId: consultation.id,
        patientId: consultation.patientId || '',
        patientName: consultation.patientName,
        patientPhone: recipientPhone,
        doctorId: consultation.doctorId,
        doctorName: req.doctor.name || consultation.doctorName,
        doctorLicense,
        diagnosis: prescription.diagnosis || notes?.diagnosis || 'General Checkup',
        medicines,
        issuedAt,
      }
      const signed = signPrescription(signedFields)
      const signatureOk = verifyPrescription(signed.payload, signed.signature, signed.algorithm)

      const rxDoc = new Prescription({
        prescriptionId,
        consultationId: consultation.id,
        doctorId: consultation.doctorId,
        doctorName: req.doctor.name || consultation.doctorName,
        doctorSpecialty: req.doctor.specialty || req.doctor.spec || consultation.doctorSpecialty,
        doctorRegNo: doctorLicense,
        doctorLicenseIsDemo: licenseIsDemo,
        patientId: consultation.patientId || '',
        patientName: consultation.patientName,
        patientPhone: recipientPhone,
        patientEmail: recipientEmail || '',
        patientAge: parseInt(consultation.patientAge, 10) || 0,
        patientGender: consultation.patientGender || '',
        diagnosis: signedFields.diagnosis,
        symptomsReported: [consultation.symptoms || consultation.patientSymptoms].filter(Boolean),
        medicines,
        clinicalAdvice: prescription.advice || notes?.advice || '',
        followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        digitalSignatureHash: signed.keyId,
        signatureAlgorithm: signed.algorithm,
        signature: signed.signature,
        signedPayload: signed.payload,
        signingKeyId: signed.keyId,
        signatureStatus: signatureOk ? 'cryptographically_signed' : 'signature_failed',
        prescribedAt: issuedAt,
      })

      // Create ONE canonical prescription first — delivery is opt-in via channels / separate send.
      const channels = prescription.deliveryChannels || req.body.deliveryChannels || null
      let emailDelivery = { configured: isEmailConfigured(), sent: false, reason: 'not_requested', channel: 'email' }
      let smsDelivery = { configured: false, sent: false, reason: 'not_requested', channel: 'sms' }
      let whatsappDelivery = { configured: isWhatsAppConfigured(), sent: false, reason: 'not_requested', channel: 'whatsapp' }

      ensureAccessToken(rxDoc)

      if (channels) {
        if (channels.email) emailDelivery = await sendPrescriptionEmail(rxDoc)
        if (channels.whatsapp) whatsappDelivery = await sendPrescriptionWhatsApp(recipientPhone, rxDoc)
        if (channels.sms) smsDelivery = await sendPrescriptionSMS(recipientPhone, rxDoc)
      }

      rxDoc.emailDelivery = emailDelivery
      rxDoc.smsDelivery = smsDelivery
      rxDoc.whatsappDelivery = whatsappDelivery
      await rxDoc.save()

      consultation.prescription = {
        prescriptionId,
        diagnosis: signedFields.diagnosis,
        medicines,
        advice: prescription.advice || notes?.advice || '',
        followUp: prescription.followUp || notes?.followUp || 'As needed',
        instructions: prescription.instructions || '',
        signature: signed.signature,
        signingKeyId: signed.keyId,
        signatureAlgorithm: signed.algorithm,
        signatureStatus: rxDoc.signatureStatus,
        issuedAt,
        doctorName: rxDoc.doctorName,
        doctorId: consultation.doctorId,
        doctorRegNo: doctorLicense,
        doctorLicenseIsDemo: licenseIsDemo,
        patientId: consultation.patientId,
        patientName: consultation.patientName,
        patientPhone: recipientPhone,
        emailDelivery,
        smsDelivery,
        whatsappDelivery,
      }
    }

    await consultation.save()
    console.log(`[consultations] Updated ${req.params.id} -> status=${consultation.status}`)
    res.json({ success: true, consultation: consultation.toObject() })
  } catch (error) { next(error) }
})

/**
 * POST /api/consultations/:id/deliver-prescription
 * Deliver the canonical signed prescription via selected channels.
 */
router.post('/consultations/:id/deliver-prescription', requireDoctorMutation, async (req, res, next) => {
  try {
    const consultation = await Consultation.findOne({ id: req.params.id })
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found.' })
    const doctorIds = [req.doctor.id, req.doctor._id?.toString(), req.doctor.entry_id].filter(Boolean)
    if (!doctorIds.includes(consultation.doctorId)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to deliver this prescription.' })
    }

    const rxId = consultation.prescription?.prescriptionId
    if (!rxId) {
      return res.status(400).json({ success: false, message: 'Save and sign the prescription before sending.' })
    }

    const rxDoc = await Prescription.findOne({ prescriptionId: rxId })
    if (!rxDoc) return res.status(404).json({ success: false, message: 'Prescription record not found.' })

    const channels = req.body.channels || {}
    const wantEmail = channels.email === true
    const wantWhatsApp = channels.whatsapp === true
    const wantSms = channels.sms === true
    if (!wantEmail && !wantWhatsApp && !wantSms) {
      return res.status(400).json({ success: false, message: 'Select at least one delivery channel.' })
    }

    if (consultation.patientId) {
      const Patient = require('../models/Patient')
      const pat = await Patient.findOne({ patientId: consultation.patientId }).lean()
      if (pat?.email) rxDoc.patientEmail = pat.email
      if (pat?.phone) rxDoc.patientPhone = pat.phone
    }

    ensureAccessToken(rxDoc)

    const results = {
      email: { configured: isEmailConfigured(), sent: false, reason: 'not_requested', channel: 'email' },
      whatsapp: { configured: isWhatsAppConfigured(), sent: false, reason: 'not_requested', channel: 'whatsapp' },
      sms: { configured: false, sent: false, reason: 'not_requested', channel: 'sms' },
    }

    if (wantEmail) results.email = await sendPrescriptionEmail(rxDoc)
    if (wantWhatsApp) results.whatsapp = await sendPrescriptionWhatsApp(rxDoc.patientPhone, rxDoc)
    if (wantSms) results.sms = await sendPrescriptionSMS(rxDoc.patientPhone, rxDoc)

    rxDoc.emailDelivery = results.email
    rxDoc.whatsappDelivery = results.whatsapp
    rxDoc.smsDelivery = results.sms
    await rxDoc.save()

    consultation.prescription = {
      ...(consultation.prescription.toObject?.() || consultation.prescription),
      emailDelivery: results.email,
      whatsappDelivery: results.whatsapp,
      smsDelivery: results.sms,
    }
    await consultation.save()

    res.json({
      success: true,
      delivery: results,
      consultation: consultation.toObject(),
    })
  } catch (error) {
    next(error)
  }
})

/** Public secure PDF access for SMS links */
router.get('/prescriptions/access/:token/pdf', async (req, res, next) => {
  try {
    const rx = await Prescription.findOne({ accessToken: req.params.token }).lean()
    if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found.' })
    const buf = await buildPrescriptionPdfBuffer(rx)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="prescription-${rx.prescriptionId}.pdf"`)
    res.send(buf)
  } catch (error) {
    next(error)
  }
})

router.post('/consultations/seed', requireDoctor, async (req, res, next) => {
  try {
    const { doctorId } = req.body
    if (doctorId && doctorId !== req.doctor.id) return res.status(403).json({ success: false, message: 'You are not authorized to seed another doctor.' })
    const doctor = req.doctor.id
    const existing = await Consultation.countDocuments({ doctorId: doctor })
    if (existing > 0) return res.json({ success: true, seeded: false, message: 'Consultations already exist.' })

    const now = Date.now()
    const makeDemo = (offset, data) => {
      const id = uuid()
      return { id, requestId: id, roomId: `consultation_${id}`, doctorId: doctor, createdAt: new Date(now - offset), ...data, _isDemo: true }
    }
    const demos = [
      makeDemo(15 * 60000, { status: 'waiting', patientName: 'Ravi Kumar', patientAge: '45', patientGender: 'Male', patientLang: 'Kannada', patientPhone: '+91 98001 11001', slot: '10:00 AM', symptoms: 'Chest pain and shortness of breath for 2 days', aiResult: { possibleDiseases: ['Angina', 'Cardiac Arrhythmia'], recommendedSpecialist: 'Cardiologist', severity: 'High', confidence: 88, emergencyFlag: true, urgencyNote: 'Seek immediate medical attention.' }, notes: null, prescription: null }),
      makeDemo(20 * 60000, { status: 'waiting', patientName: 'Sunita Devi', patientAge: '60', patientGender: 'Female', patientLang: 'Hindi', patientPhone: '+91 98002 22002', slot: '11:00 AM', symptoms: 'Persistent headache and dizziness for 3 days', aiResult: { possibleDiseases: ['Hypertension', 'Migraine'], recommendedSpecialist: 'Neurologist', severity: 'Moderate', confidence: 74, emergencyFlag: false, urgencyNote: 'Consult within 24 hours.' }, notes: null, prescription: null }),
      makeDemo(2 * 3600000, { status: 'completed', patientName: 'Meghana Patil', patientAge: '28', patientGender: 'Female', patientLang: 'English', patientPhone: '+91 98003 33003', slot: '09:00 AM', symptoms: 'Fever, cough and body ache for 3 days', aiResult: { possibleDiseases: ['Viral Fever', 'Influenza'], recommendedSpecialist: 'General Physician', severity: 'Low', confidence: 82, emergencyFlag: false, urgencyNote: 'Rest and hydration advised.' }, notes: { diagnosis: 'Viral fever with mild respiratory symptoms', medicines: [{ name: 'Paracetamol 500mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '3 days' }], advice: 'Rest, drink plenty of fluids', followUp: '3 days' }, prescription: null }),
    ]
    await Consultation.insertMany(demos)
    res.json({ success: true, seeded: true, count: demos.length })
  } catch (error) { next(error) }
})

router.delete('/consultations', requireDoctor, async (_req, res, next) => {
  try {
    await Consultation.deleteMany({})
    res.json({ success: true, message: 'All consultations cleared.' })
  } catch (error) { next(error) }
})

module.exports = router
