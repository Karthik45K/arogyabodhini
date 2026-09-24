const express = require('express')
const router = express.Router()
const Consultation = require('../models/Consultation')
const PatientDocument = require('../models/PatientDocument')
const Prescription = require('../models/Prescription')
const { requirePatient } = require('../middleware/patientAuth')
const { requireDoctor } = require('../middleware/doctorAuth')
const { sendPrescriptionEmail, isSmtpConfigured, isEmailConfigured } = require('../services/emailService')
const { sendPrescriptionSMS, isSmsConfigured } = require('../services/smsService')
const { verifyPrescription } = require('../services/prescriptionSigner')
const fs = require('fs')
const path = require('path')
const multer = require('multer')

const uploadDir = path.join(__dirname, '../../uploads/records')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    if (extname && mimetype) return cb(null, true)
    cb(new Error('Only PDF, JPG, and PNG files are allowed.'))
  }
})

router.get('/patient/consultations', requirePatient, async (req, res, next) => {
  try {
    const consultations = await Consultation.find({ patientId: req.patient.patientId }).sort({ createdAt: -1 }).lean()
    res.json({ success: true, consultations })
  } catch (error) { next(error) }
})

router.get('/patient/prescriptions', requirePatient, async (req, res, next) => {
  try {
    const consultations = await Consultation.find({
      patientId: req.patient.patientId,
      $or: [
        { prescription: { $ne: null } },
        { 'notes.medicines': { $exists: true, $ne: [] } },
      ],
    }).sort({ createdAt: -1 }).lean()

    // 2. Also check standalone Prescription collection
    const standaloneRx = await Prescription.find({
      patientId: req.patient.patientId,
    }).sort({ prescribedAt: -1 }).lean().catch(() => [])
    const standaloneByConsult = new Map(standaloneRx.map((s) => [s.consultationId, s]))
    const standaloneById = new Map(standaloneRx.map((s) => [s.prescriptionId, s]))

    const prescriptionList = []
    const seenIds = new Set()

    // Add from consultations
    for (const c of consultations) {
      const rx = c.prescription || {}
      const stored = standaloneByConsult.get(c.id) || standaloneById.get(rx.prescriptionId)
      const meds = stored?.medicines || rx.medicines || c.notes?.medicines || []
      const item = {
        consultationId: c.id,
        prescriptionId: stored?.prescriptionId || rx.prescriptionId || c.id,
        prescription: {
          medicines: meds,
          diagnosis: stored?.diagnosis || rx.diagnosis || c.notes?.diagnosis || c.symptoms || 'Clinical Consultation',
          advice: stored?.clinicalAdvice || rx.advice || c.notes?.advice || '',
          followUp: rx.followUp || c.notes?.followUp || 'As needed',
          instructions: rx.instructions || '',
          signatureStatus: stored?.signatureStatus || rx.signatureStatus || 'pending',
          signingKeyId: stored?.signingKeyId || rx.signingKeyId || '',
          signatureAlgorithm: stored?.signatureAlgorithm || rx.signatureAlgorithm || '',
          signatureVerified: stored?.signature
            ? verifyPrescription(stored.signedPayload, stored.signature, stored.signatureAlgorithm)
            : false,
        },
        doctorName: stored?.doctorName || c.doctorName,
        doctorSpecialty: stored?.doctorSpecialty || c.doctorSpecialty || c.aiResult?.recommendedSpecialist || 'Specialist',
        doctorRegNo: stored?.doctorRegNo || rx.doctorRegNo || '',
        doctorLicenseIsDemo: stored?.doctorLicenseIsDemo ?? rx.doctorLicenseIsDemo,
        consultationDate: stored?.prescribedAt || c.completedAt || c.createdAt,
        diagnosis: stored?.diagnosis || rx.diagnosis || c.notes?.diagnosis || c.symptoms || 'Clinical Consultation',
        status: (stored?.signatureStatus || rx.signatureStatus) === 'cryptographically_signed' ? 'Signed' : 'Issued',
        patientName: stored?.patientName || c.patientName,
        patientId: stored?.patientId || c.patientId,
        patientPhone: stored?.patientPhone || c.patientPhone,
      }
      prescriptionList.push(item)
      seenIds.add(c.id)
    }

    // Add any standalone prescriptions not already in list
    for (const s of standaloneRx) {
      if (s.consultationId && seenIds.has(s.consultationId)) continue
      prescriptionList.push({
        consultationId: s.consultationId || s._id.toString(),
        prescriptionId: s.prescriptionId,
        prescription: {
          medicines: s.medicines || [],
          diagnosis: s.diagnosis || 'Clinical Consultation',
          advice: s.clinicalAdvice || '',
          followUp: s.followUpDate ? new Date(s.followUpDate).toLocaleDateString('en-IN') : 'As needed',
          instructions: '',
          signatureStatus: s.signatureStatus || 'cryptographically_signed',
          signingKeyId: s.signingKeyId || '',
          signatureAlgorithm: s.signatureAlgorithm || 'RSA-SHA256',
          signatureVerified: s.signature ? verifyPrescription(s.signedPayload, s.signature, s.signatureAlgorithm) : false,
        },
        doctorName: s.doctorName,
        doctorSpecialty: s.doctorSpecialty || 'Specialist',
        doctorRegNo: s.doctorRegNo || '',
        consultationDate: s.prescribedAt || s.createdAt,
        diagnosis: s.diagnosis || 'Clinical Consultation',
        status: 'Signed',
        patientName: s.patientName,
        patientId: s.patientId,
        patientPhone: s.patientPhone,
        emailDelivery: s.emailDelivery,
        smsDelivery: s.smsDelivery,
      })
    }

    res.json({
      success: true,
      prescriptions: prescriptionList,
      deliveryChannels: {
        emailConfigured: isEmailConfigured(),
        smsConfigured: isSmsConfigured(),
        patientHasEmail: Boolean(req.patient.email),
        patientHasPhone: Boolean(req.patient.phone),
      },
    })
  } catch (error) { next(error) }
})

// Patient uploading document
router.post('/patient/documents', requirePatient, upload.single('document'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' })
    const { title } = req.body
    
    const doc = new PatientDocument({
      patientId: req.patient.patientId,
      title: title || req.file.originalname,
      fileUrl: `/uploads/records/${req.file.filename}`,
      fileType: req.file.mimetype,
      sizeBytes: req.file.size
    })
    
    await doc.save()
    res.status(201).json({ success: true, message: 'Report uploaded successfully.', document: doc })
  } catch (error) { next(error) }
})

// Patient retrieving their documents
router.get('/patient/documents', requirePatient, async (req, res, next) => {
  try {
    const documents = await PatientDocument.find({ patientId: req.patient.patientId }).sort({ uploadedAt: -1 }).lean()
    res.json({ success: true, documents })
  } catch (error) { next(error) }
})

router.post('/patient/prescriptions/:id/email', requirePatient, async (req, res, next) => {
  try {
    const rx = await Prescription.findOne({
      patientId: req.patient.patientId,
      $or: [{ prescriptionId: req.params.id }, { consultationId: req.params.id }],
    })
    if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found.' })
    if (!rx.patientEmail && req.patient.email) rx.patientEmail = req.patient.email
    const result = await sendPrescriptionEmail(rx)
    rx.emailDelivery = result
    await rx.save()
    if (!result.sent) {
      return res.status(503).json({
        success: false,
        delivery: result,
        message: result.reason === 'not_configured'
          ? 'Email service is not configured.'
          : result.reason === 'no_email'
            ? 'No email is saved on this patient account.'
            : (result.error || 'Unable to send email.'),
      })
    }
    res.json({ success: true, delivery: result })
  } catch (error) { next(error) }
})

router.post('/patient/prescriptions/:id/sms', requirePatient, async (req, res, next) => {
  try {
    const rx = await Prescription.findOne({
      patientId: req.patient.patientId,
      $or: [{ prescriptionId: req.params.id }, { consultationId: req.params.id }],
    })
    if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found.' })
    const result = await sendPrescriptionSMS(rx.patientPhone || req.patient.phone, rx)
    rx.smsDelivery = result
    await rx.save()
    if (!result.sent) {
      return res.status(503).json({
        success: false,
        delivery: result,
        message: result.reason === 'not_configured'
          ? 'SMS service is not configured.'
          : result.reason === 'no_phone'
            ? 'No mobile number is saved on this patient account.'
            : (result.message || 'Unable to send SMS.'),
      })
    }
    res.json({ success: true, delivery: result })
  } catch (error) { next(error) }
})

router.get('/patient/prescriptions/:id/pdf', requirePatient, async (req, res, next) => {
  try {
    const rx = await Prescription.findOne({
      patientId: req.patient.patientId,
      $or: [{ prescriptionId: req.params.id }, { consultationId: req.params.id }],
    }).lean()
    if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found.' })
    const { buildPrescriptionPdfBuffer } = require('../services/prescriptionPdfService')
    const buf = await buildPrescriptionPdfBuffer(rx)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="prescription-${rx.prescriptionId}.pdf"`)
    res.send(buf)
  } catch (error) {
    next(error)
  }
})

// Doctor retrieving a patient's documents
router.get('/doctors/patient-documents/:patientId', requireDoctor, async (req, res, next) => {
  try {
    const rawId = String(req.params.patientId || '').trim()
    if (!rawId || rawId === 'null' || rawId === 'undefined') {
      return res.json({ success: true, documents: [] })
    }

    // Try finding by exact patientId first, or if rawId is a consultation id, find that consultation's patientId
    let patientId = rawId
    if (rawId.startsWith('cons-')) {
      const consult = await Consultation.findOne({ id: rawId }).lean()
      if (consult?.patientId) patientId = consult.patientId
    }

    const documents = await PatientDocument.find({
      $or: [
        { patientId: patientId },
        { patientId: rawId }
      ]
    }).sort({ uploadedAt: -1 }).lean()

    res.json({ success: true, documents })
  } catch (error) { next(error) }
})

module.exports = router