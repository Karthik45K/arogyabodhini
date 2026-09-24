const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const DoctorApplication = require('../models/DoctorApplication');
const Doctor = require('../models/Doctor');
const Consultation = require('../models/Consultation');
const mongoose = require('mongoose');
const { sendDoctorRejectionEmail, sendDoctorApprovalEmail } = require('../services/emailService');
const { normalizeDoctorSpecialty } = require('../config/diseaseSpecialtyMap');

// Admin Login handler
const handleAdminLogin = async (req, res) => {
  const identifier = req.body.email || req.body.username;
  const { password } = req.body;
  try {
    const admin = await Admin.findOne({
      $or: [{ username: identifier }, { email: identifier }]
    });
    if (!admin) return res.status(401).json({ message: 'Invalid admin credentials' });
    
    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid admin credentials' });

    const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    res.json({ token, success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

router.post('/auth/admin/login', handleAdminLogin);
router.post('/admin/login', handleAdminLogin);

// Admin Auth Middleware
const authAdmin = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Not authorized' });
    req.adminId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Admin Dashboard Stats
router.get('/admin/dashboard', authAdmin, async (req, res) => {
  try {
    const totalDoctors = await Doctor.countDocuments();
    const pendingApplications = await DoctorApplication.countDocuments({ status: 'pending' });
    const approvedApplications = await DoctorApplication.countDocuments({ status: 'approved' });
    const rejectedApplications = await DoctorApplication.countDocuments({ status: 'rejected' });
    
    res.json({
      totalDoctors,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// List applications
router.get('/admin/doctor-applications', authAdmin, async (req, res) => {
  try {
    const apps = await DoctorApplication.find().sort({ submittedAt: -1 });
    res.json({ success: true, applications: apps });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve application
router.post('/admin/doctor-applications/:id/approve', authAdmin, async (req, res) => {
  try {
    const app = await DoctorApplication.findById(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found' });

    // Check if doctor already exists
    const { toMajorSpecialty } = require('../config/majorSpecialties');
    const major = toMajorSpecialty(app.specialty)
    const canonicalSpecialty = major.canonical || normalizeDoctorSpecialty(app.specialty)
    let doctor = await Doctor.findOne({ email: app.email });
    if (!doctor) {
      doctor = new Doctor({
        entry_id: new mongoose.Types.ObjectId().toString(),
        name: app.fullName,
        email: app.email,
        phone: app.phone,
        passwordHash: app.passwordHash,
        specialty: canonicalSpecialty || app.specialty,
        experience_years: app.experienceYears || 1,
        bangalore_location: app.address || 'Karnataka, India',
        registrationNumber: app.registrationNumber || '',
        availabilityStatus: 'available',
        fee: app.consultationFee || 299
      });
      await doctor.save();
    } else {
      doctor.availabilityStatus = 'available';
      if (app.passwordHash) doctor.passwordHash = app.passwordHash;
      if (app.specialty) doctor.specialty = canonicalSpecialty || app.specialty;
      await doctor.save();
    }

    app.status = 'approved';
    app.doctorId = doctor._id.toString();
    app.reviewedAt = new Date();
    await app.save();

    // Send email with 6s bounded wait so admin gets confirmation if quick, without hanging
    try {
      await Promise.race([
        sendDoctorApprovalEmail(app.email, app.fullName),
        new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 6000))
      ]);
    } catch (emailErr) {
      console.error('[admin/approve] Email error for', app.email, ':', emailErr.message);
    }

    res.json({ success: true, message: 'Approved successfully', doctorId: app.doctorId });
  } catch (err) {
    console.error('[admin/approve] Server error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// Reject application
router.post('/admin/doctor-applications/:id/reject', authAdmin, async (req, res) => {
  try {
    const app = await DoctorApplication.findById(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found' });

    app.status = 'rejected';
    app.rejectionReason = req.body.reason || 'Information could not be verified.';
    app.reviewedAt = new Date();
    await app.save();

    // Send email with 6s bounded wait
    try {
      await Promise.race([
        sendDoctorRejectionEmail(app.email, app.fullName, app.rejectionReason),
        new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 6000))
      ]);
    } catch (emailErr) {
      console.error('[admin/reject] Email error for', app.email, ':', emailErr.message);
    }

    res.json({ success: true, message: 'Rejected successfully' });
  } catch (err) {
    console.error('[admin/reject] Server error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// Resend notification email (approval or rejection)
router.post('/admin/doctor-applications/:id/resend-email', authAdmin, async (req, res) => {
  try {
    const app = await DoctorApplication.findById(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found' });

    let emailResult;
    if (app.status === 'approved') {
      emailResult = await sendDoctorApprovalEmail(app.email, app.fullName);
    } else if (app.status === 'rejected') {
      emailResult = await sendDoctorRejectionEmail(app.email, app.fullName, app.rejectionReason || 'Information could not be verified.');
    } else {
      return res.status(400).json({ message: 'Application is still pending review.' });
    }

    res.json({ success: true, message: `Notification email dispatched to ${app.email}`, emailResult });
  } catch (err) {
    console.error('[admin/resend-email] Error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// List registered doctors (Doctor collection — not applications)
router.get('/admin/doctors', authAdmin, async (req, res) => {
  try {
    const doctors = await Doctor.find({})
      .select('_id entry_id id name email specialty experience_years bangalore_location availabilityStatus isActive registrationNumber phone createdAt')
      .sort({ name: 1 })
      .lean();
    res.json({
      success: true,
      doctors: doctors.map((d) => ({
        ...d,
        doctorId: d._id.toString(),
      })),
    });
  } catch (err) {
    console.error('[admin/doctors] List error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * DELETE /api/admin/doctors/:doctorId
 * Admin-only. Deletes the Doctor document by MongoDB _id.
 * Does NOT cascade-delete consultations, prescriptions, patients, or reports.
 */
router.delete('/admin/doctors/:doctorId', authAdmin, async (req, res) => {
  try {
    const doctorId = String(req.params.doctorId || '').trim();
    if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: 'Invalid doctor ID.' });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    const idVariants = [
      doctor._id.toString(),
      doctor.entry_id,
      doctor.id,
    ].filter(Boolean);

    // Block delete while doctor is in an active (accepted) consultation
    const activeConsult = await Consultation.findOne({
      doctorId: { $in: idVariants },
      status: 'accepted',
    }).lean();

    if (activeConsult) {
      return res.status(409).json({
        message: 'Doctor cannot be deleted while handling an active consultation.',
      });
    }

    // Release waiting/pending assignments so patients are not stuck
    await Consultation.updateMany(
      {
        doctorId: { $in: idVariants },
        status: 'waiting',
      },
      {
        $set: {
          matchStatus: 'SEARCHING',
          doctorName: '',
        },
        $unset: { doctorId: 1 },
      }
    );

    // Precise single-document delete by _id only
    const deleted = await Doctor.findByIdAndDelete(doctor._id);
    if (!deleted) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    // Keep DoctorApplication history; clear live doctorId link only
    await DoctorApplication.updateMany(
      { doctorId: doctor._id.toString() },
      { $unset: { doctorId: 1 } }
    );

    res.json({
      success: true,
      message: 'Doctor deleted successfully.',
      doctorId: doctor._id.toString(),
      name: doctor.name || '',
    });
  } catch (err) {
    console.error('[admin/doctors] Delete error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

module.exports = router;
