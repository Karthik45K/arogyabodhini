const express = require('express')
const router = express.Router()
const Consultation = require('../models/Consultation')
const PatientDocument = require('../models/PatientDocument')
const { requirePatient } = require('../middleware/patientAuth')
const { requireDoctor } = require('../middleware/doctorAuth')
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
    const query = [{ patientId: req.patient.patientId }]
    if (req.patient.phone) query.push({ patientPhone: req.patient.phone })
    if (req.patient.email) query.push({ patientEmail: req.patient.email })
    if (req.patient.name) query.push({ patientName: new RegExp(`^${req.patient.name.trim()}$`, 'i') })
    const consultations = await Consultation.find({ $or: query }).sort({ createdAt: -1 }).lean()
    res.json({ success: true, consultations })
  } catch (error) { next(error) }
})

router.get('/patient/prescriptions', requirePatient, async (req, res, next) => {
  try {
    const query = [{ patientId: req.patient.patientId }]
    if (req.patient.phone) query.push({ patientPhone: req.patient.phone })
    if (req.patient.email) query.push({ patientEmail: req.patient.email })
    if (req.patient.name) query.push({ patientName: new RegExp(`^${req.patient.name.trim()}$`, 'i') })

    // 1. Fetch consultations with prescription or medicines in notes
    const consultations = await Consultation.find({
      $or: query,
      $and: [
        {
          $or: [
            { prescription: { $ne: null } },
            { 'notes.medicines': { $exists: true, $ne: [] } },
          ]
        }
      ]
    }).sort({ createdAt: -1 }).lean()

    // 2. Also check standalone Prescription collection
    const Prescription = require('../models/Prescription')
    const standaloneRx = await Prescription.find({
      $or: [
        { patientId: req.patient.patientId },
        ...(req.patient.email ? [{ patientEmail: req.patient.email }] : []),
        ...(req.patient.name ? [{ patientName: new RegExp(`^${req.patient.name.trim()}$`, 'i') }] : [])
      ]
    }).sort({ prescribedAt: -1 }).lean().catch(() => [])

    const prescriptionList = []
    const seenIds = new Set()

    // Add from consultations
    for (const c of consultations) {
      const rx = c.prescription || {}
      const meds = rx.medicines || c.notes?.medicines || []
      const item = {
        consultationId: c.id,
        prescription: {
          medicines: meds,
          diagnosis: rx.diagnosis || c.notes?.diagnosis || c.symptoms || 'Clinical Consultation',
          advice: rx.advice || c.notes?.advice || '',
          followUp: rx.followUp || c.notes?.followUp || 'As needed',
          instructions: rx.instructions || '',
          digitalSignatureHash: rx.digitalSignatureHash || `RX-${c.id.slice(-8).toUpperCase()}`,
        },
        doctorName: c.doctorName,
        doctorSpecialty: c.doctorSpecialty || c.aiResult?.recommendedSpecialist || 'Specialist',
        consultationDate: c.completedAt || c.createdAt,
        diagnosis: rx.diagnosis || c.notes?.diagnosis || c.symptoms || 'Clinical Consultation',
      }
      prescriptionList.push(item)
      seenIds.add(c.id)
    }

    // Add any standalone prescriptions not already in list
    for (const s of standaloneRx) {
      if (s.consultationId && seenIds.has(s.consultationId)) continue
      prescriptionList.push({
        consultationId: s.consultationId || s._id.toString(),
        prescription: {
          medicines: s.medicines || [],
          diagnosis: s.diagnosis || 'Clinical Consultation',
          advice: s.clinicalAdvice || '',
          followUp: s.followUpDate ? new Date(s.followUpDate).toLocaleDateString('en-IN') : 'As needed',
          instructions: '',
          digitalSignatureHash: s.digitalSignatureHash || 'CERTIFIED-RX',
        },
        doctorName: s.doctorName,
        doctorSpecialty: s.doctorSpecialty || 'Specialist',
        consultationDate: s.prescribedAt || s.createdAt,
        diagnosis: s.diagnosis || 'Clinical Consultation',
      })
    }

    res.json({ success: true, prescriptions: prescriptionList })
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
    res.status(201).json({ success: true, document: doc })
  } catch (error) { next(error) }
})

// Patient retrieving their documents
router.get('/patient/documents', requirePatient, async (req, res, next) => {
  try {
    const documents = await PatientDocument.find({ patientId: req.patient.patientId }).sort({ uploadedAt: -1 }).lean()
    res.json({ success: true, documents })
  } catch (error) { next(error) }
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