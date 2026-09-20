const mongoose = require('mongoose');

const doctorApplicationSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  passwordHash: { type: String, required: true },
  specialty: String,
  experienceYears: Number,
  clinicName: String,
  registrationNumber: String,
  address: String,
  consultationFee: Number,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: Date,
  rejectionReason: String,
  doctorId: String
});

module.exports = mongoose.model('DoctorApplication', doctorApplicationSchema);
