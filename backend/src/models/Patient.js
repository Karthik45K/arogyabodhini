const mongoose = require('mongoose')

const patientSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    age: { type: String, default: '' },
    gender: { type: String, default: '' },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true, index: { sparse: true } },
    passwordHash: { type: String, required: true },
    sessionTokenHash: { type: String, default: null },
    sessionExpiresAt: { type: Date, default: null },
  },
  { collection: 'patients', timestamps: true }
)

module.exports = mongoose.model('Patient', patientSchema)