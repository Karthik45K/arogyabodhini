const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const DoctorApplication = require('../models/DoctorApplication');
const Doctor = require('../models/Doctor');
const mongoose = require('mongoose');
const { sendDoctorRejectionEmail, sendDoctorApprovalEmail } = require('../services/emailService');

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
    if (app.status === 'approved') return res.status(400).json({ message: 'Application is already approved' });

    // Check if doctor already exists
    let doctor = await Doctor.findOne({ email: app.email });
    if (!doctor) {
      doctor = new Doctor({
        entry_id: new mongoose.Types.ObjectId().toString(),
        name: app.fullName,
        email: app.email,
        phone: app.phone,
        passwordHash: app.passwordHash,
        specialty: app.specialty,
        experience_years: app.experienceYears || 1,
        bangalore_location: app.address || 'Karnataka, India',
        availabilityStatus: 'available',
        fee: app.consultationFee || 299
      });
      await doctor.save();
    } else {
      doctor.availabilityStatus = 'available';
      if (app.passwordHash) doctor.passwordHash = app.passwordHash;
      if (app.specialty) doctor.specialty = app.specialty;
      await doctor.save();
    }

    app.status = 'approved';
    app.doctorId = doctor._id.toString();
    app.reviewedAt = new Date();
    await app.save();

    // Send approval email with logged result
    const emailResult = await sendDoctorApprovalEmail(app.email, app.fullName);
    console.log('[admin/approve] Email dispatch status for', app.email, ':', emailResult);

    res.json({ success: true, message: 'Approved successfully', doctorId: app.doctorId, emailResult });
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
    if (app.status === 'rejected') return res.status(400).json({ message: 'Application is already rejected' });

    app.status = 'rejected';
    app.rejectionReason = req.body.reason || 'Information could not be verified.';
    app.reviewedAt = new Date();
    await app.save();

    // Send rejection email with logged result
    const emailResult = await sendDoctorRejectionEmail(app.email, app.fullName, app.rejectionReason);
    console.log('[admin/reject] Email dispatch status for', app.email, ':', emailResult);

    res.json({ success: true, message: 'Rejected successfully', emailResult });
  } catch (err) {
    console.error('[admin/reject] Server error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

module.exports = router;
