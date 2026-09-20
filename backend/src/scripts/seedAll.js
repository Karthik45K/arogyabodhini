const mongoose = require('mongoose');
const seedAdmin = require('./seedAdmin');
const autoSeed = require('./autoSeed');
const DoctorApplication = require('../models/DoctorApplication');
const connectDB = require('../config/db');

async function seedAll() {
  try {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
    
    // Seed Admin
    await seedAdmin();
    
    // Seed Verified Sample Doctors
    await autoSeed();
    
    // Seed Sample Doctor Applications
    console.log('[Database] Seeding sample doctor applications...');
    
    const count = await DoctorApplication.countDocuments();
    if (count === 0) {
      const apps = [
        {
          fullName: 'Dr. Jane Smith',
          email: 'jane.smith@example.com',
          phone: '+919876543210',
          passwordHash: 'dummyhash',
          specialty: 'Cardiologist',
          experienceYears: 12,
          clinicName: 'Heart Care Center, Bangalore',
          registrationNumber: 'KMC-12345',
          address: 'Jayanagar, Bangalore',
          consultationFee: 800,
          status: 'pending'
        },
        {
          fullName: 'Dr. Anil Kumar',
          email: 'anil.kumar@example.com',
          phone: '+919876543211',
          passwordHash: 'dummyhash',
          specialty: 'Pediatrician',
          experienceYears: 8,
          clinicName: 'Kids Clinic',
          registrationNumber: 'KMC-54321',
          address: 'Indiranagar, Bangalore',
          consultationFee: 500,
          status: 'approved'
        },
        {
          fullName: 'Dr. Sunita Sharma',
          email: 'sunita.s@example.com',
          phone: '+919876543212',
          passwordHash: 'dummyhash',
          specialty: 'Dermatologist',
          experienceYears: 3,
          clinicName: 'Skin & Hair Clinic',
          registrationNumber: 'KMC-99999',
          address: 'Koramangala, Bangalore',
          consultationFee: 1000,
          status: 'rejected'
        }
      ];
      await DoctorApplication.insertMany(apps);
      console.log('[Database] Created 3 sample doctor applications (pending, approved, rejected).');
    } else {
      console.log('[Database] Doctor applications already exist, skipping.');
    }
    
    console.log('[Database] seedAll completed successfully.');
  } catch (err) {
    console.error('[Database] seedAll failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  seedAll().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = seedAll;
