const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  prescriptionId: { type: String, required: true, unique: true, index: true },
  consultationId: { type: String, required: true, index: true },
  doctorId: { type: String, required: true, index: true },
  doctorName: { type: String, required: true },
  doctorSpecialty: { type: String, required: true },
  doctorRegNo: { type: String, default: '' },
  doctorLicenseIsDemo: { type: Boolean, default: true },
  patientId: { type: String, index: true },
  patientName: { type: String, required: true },
  patientPhone: { type: String, default: '' },
  patientEmail: { type: String, default: '' },
  patientAge: { type: Number },
  patientGender: { type: String },
  diagnosis: { type: String, required: true },
  symptomsReported: [String],
  medicines: [
    {
      name: { type: String, required: true },
      dosage: { type: String, required: true },
      frequency: { type: String, required: true },
      duration: { type: String, required: true },
      instructions: { type: String, default: 'After food' }
    }
  ],
  clinicalAdvice: { type: String },
  followUpDate: { type: Date },
  digitalSignatureHash: { type: String, default: '' },
  signatureAlgorithm: { type: String, default: 'RSA-SHA256' },
  signature: { type: String, required: true },
  signedPayload: { type: String, required: true },
  signingKeyId: { type: String, required: true },
  signatureStatus: { type: String, default: 'cryptographically_signed' },
  emailDelivery: mongoose.Schema.Types.Mixed,
  smsDelivery: mongoose.Schema.Types.Mixed,
  whatsappDelivery: mongoose.Schema.Types.Mixed,
  accessToken: { type: String, index: true, sparse: true },
  prescribedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);
