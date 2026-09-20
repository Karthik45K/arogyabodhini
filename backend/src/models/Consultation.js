const mongoose = require('mongoose')

const consultationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    requestId: String,
    roomId: String,
    status: { type: String, default: 'waiting' },
    doctorId: { type: String, required: true, index: true },
    doctorName: String,
    doctorSpecialty: String,
    patientId: { type: String, default: null, index: true },
    patientName: String,
    patientAge: String,
    patientGender: String,
    patientLang: String,
    patientPhone: String,
    patientContact: String,
    patientSymptoms: String,
    symptoms: String,
    aiResult: mongoose.Schema.Types.Mixed,
    slot: String,
    consultationType: String,
    createdAt: { type: Date, default: Date.now },
    acceptedAt: Date,
    completedAt: Date,
    notes: mongoose.Schema.Types.Mixed,
    prescription: mongoose.Schema.Types.Mixed,
    _isDemo: Boolean,
  },
  { collection: 'consultations', strict: false }
)

module.exports = mongoose.model('Consultation', consultationSchema)