const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const User = require('../models/User');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const email = process.argv[2] || 'admin@rentme.com';
    const password = process.argv[3] || 'admin123';

    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`Admin already exists: ${email}`);
      process.exit(0);
    }

    const admin = await User.create({
      name: 'Admin',
      email,
      password,
      role: 'admin',
      isVerified: true,
      verificationStatus: 'approved',
    });

    console.log(`✅ Admin created: ${email} / ${password}`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to create admin:', error);
    process.exit(1);
  }
}

createAdmin();
