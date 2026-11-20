const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const { validateEmail, validatePassword } = require("./sanitize");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const User = require("../models/User");

async function createAdmin() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("MONGODB_URI must be set in .env before creating an admin user.");
      process.exit(1);
    }

    const email = (process.argv[2] || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const password = process.argv[3] || process.env.ADMIN_PASSWORD || "";

    if (!validateEmail(email)) {
      console.error("Usage: node server/utils/createAdmin.js <valid-email> <strong-password>");
      process.exit(1);
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      console.error(`Weak admin password: ${pwCheck.message}`);
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`Admin account already exists for ${email}`);
      process.exit(0);
    }

    await User.create({
      name: "Administrator",
      email,
      password,
      role: "admin",
      isVerified: true,
      verificationStatus: "approved",
    });

    console.log(`Admin account created successfully for ${email}`);
    process.exit(0);
  } catch (error) {
    console.error("Failed to create admin account:", error.message);
    process.exit(1);
  }
}

createAdmin();
