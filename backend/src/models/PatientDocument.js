const mongoose = require('mongoose');

const patientDocumentSchema = new mongoose.Schema({
  patientId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileType: { type: String, required: true },
  sizeBytes: Number,
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PatientDocument', patientDocumentSchema);
