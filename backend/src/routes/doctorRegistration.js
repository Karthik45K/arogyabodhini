const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const DoctorApplication = require('../models/DoctorApplication');

// Doctor Registration
router.post('/doctors/register', async (req, res) => {
  try {
    const { password, ...data } = req.body;
    
    const existing = await DoctorApplication.findOne({ email: data.email });
    if (existing) {
      if (existing.status === 'rejected') {
        // Allow doctor to update and re-submit their rejected application
        existing.fullName = data.fullName || existing.fullName;
        existing.phone = data.phone || existing.phone;
        existing.specialty = data.specialty || existing.specialty;
        existing.experienceYears = data.experienceYears || existing.experienceYears;
        existing.clinicName = data.clinicName || existing.clinicName;
        existing.registrationNumber = data.registrationNumber || existing.registrationNumber;
        existing.address = data.address || existing.address;
        existing.consultationFee = data.consultationFee || existing.consultationFee;
        existing.status = 'pending'; // Reset back to pending for admin re-review
        existing.rejectionReason = undefined;
        existing.submittedAt = new Date();
        if (password) existing.passwordHash = await bcrypt.hash(password, 10);
        await existing.save();
        return res.status(200).json({ message: 'Application re-submitted for review successfully.' });
      }
      return res.status(400).json({ message: 'An active or approved application with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newApp = new DoctorApplication({ ...data, passwordHash });
    await newApp.save();

    res.status(201).json({ message: 'Application submitted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
