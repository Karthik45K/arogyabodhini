const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  consultationId: { type: String, required: true, index: true },
  doctorId: { type: String, required: true, index: true },
  doctorName: { type: String, required: true },
  doctorSpecialty: { type: String, required: true },
  doctorRegNo: { type: String, default: 'MCI-VERIFIED' },
  patientId: { type: String, index: true },
  patientName: { type: String, required: true },
  patientEmail: { type: String, required: true },
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
  digitalSignatureHash: { type: String, required: true },
  prescribedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);
