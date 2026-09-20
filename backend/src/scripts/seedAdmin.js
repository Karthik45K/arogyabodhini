const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const connectDB = require('../config/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function seedAdmin(force = false) {
  try {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
    
    const adminUsername = process.env.ADMIN_EMAIL || 'admin@arogyabhodhini.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin@41';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@arogyabhodhini.com';

    const existingAdmin = await Admin.findOne({ username: adminUsername });
    const shouldForce = force || process.argv.includes('--force') || process.env.RESET_ADMIN === 'true';

    if (existingAdmin) {
      if (shouldForce) {
        existingAdmin.passwordHash = await bcrypt.hash(adminPassword, 10);
        existingAdmin.email = adminEmail;
        await existingAdmin.save();
        console.log(`[Database] Admin updated (forced): ${adminUsername} / ${adminPassword}`);
      } else {
        console.log(`[Database] Admin '${adminUsername}' already exists. Skipping. (Use --force to reset)`);
      }
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const newAdmin = new Admin({ username: adminUsername, email: adminEmail, passwordHash });
    await newAdmin.save();
    
    console.log(`[Database] No admin found. Created default admin: ${adminUsername} / ${adminPassword}`);
  } catch (err) {
    console.error('[Database] Admin seed error:', err);
    throw err;
  }
}

if (require.main === module) {
  seedAdmin().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = seedAdmin;
