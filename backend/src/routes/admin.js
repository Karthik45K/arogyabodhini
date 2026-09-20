const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const DoctorApplication = require('../models/DoctorApplication');
const Doctor = require('../models/Doctor');
const mongoose = require('mongoose');

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
    if (!app || app.status !== 'pending') return res.status(400).json({ message: 'Invalid application' });

    // Create doctor
    const newDoctor = new Doctor({
      entry_id: new mongoose.Types.ObjectId().toString(),
      name: app.fullName,
      email: app.email,
      phone: app.phone,
      passwordHash: app.passwordHash,
      specialty: app.specialty,
      experience_years: app.experienceYears,
      bangalore_location: app.address,
      availabilityStatus: 'available',
      fee: app.consultationFee
    });
    await newDoctor.save();

    app.status = 'approved';
    app.doctorId = newDoctor._id.toString();
    app.reviewedAt = new Date();
    await app.save();
    
    await sendDoctorApprovalEmail(app.email, app.fullName);

    res.json({ message: 'Approved successfully', doctorId: app.doctorId });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

const { sendDoctorRejectionEmail, sendDoctorApprovalEmail } = require('../services/emailService');

// Reject application
router.post('/admin/doctor-applications/:id/reject', authAdmin, async (req, res) => {
  try {
    const app = await DoctorApplication.findById(req.params.id);
    if (!app || app.status !== 'pending') return res.status(400).json({ message: 'Invalid application' });

    app.status = 'rejected';
    app.rejectionReason = req.body.reason || 'No reason provided';
    app.reviewedAt = new Date();
    await app.save();
    
    await sendDoctorRejectionEmail(app.email, app.fullName, app.rejectionReason);

    res.json({ message: 'Rejected successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
