/**
 * Database Seed Script
 * Run: node server/utils/seed.js
 * Creates an admin user and sample data for development
 */
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const User = require("../models/User");
const Listing = require("../models/Listing");

const SAMPLE_LISTINGS = [
  {
    title: "Spacious Single Room near Pulchowk Campus",
    description: "A bright, well-ventilated single room perfect for engineering students. Quiet neighborhood with 24/7 water supply. Walking distance to Pulchowk Engineering Campus. Includes shared kitchen and bathroom.",
    roomType: "single",
    rent: 7000,
    deposit: 5000,
    location: { district: "Lalitpur", area: "Pulchowk", address: "Near Pulchowk Campus Gate, Ward 22", nearbyCollege: "Pulchowk Engineering Campus", distanceToCollege: 0.3 },
    amenities: ["wifi", "hot_water", "water_tank", "kitchen"],
    rules: "No smoking. Quiet hours after 10 PM.",
    isAvailable: true,
    status: "approved",
  },
  {
    title: "Furnished Double Room in Koteshwor",
    description: "Fully furnished double room with attached bathroom. Ideal for students or working professionals. Located near the main road with easy access to public transport. Includes bed, desk, and wardrobe.",
    roomType: "double",
    rent: 12000,
    deposit: 10000,
    location: { district: "Kathmandu", area: "Koteshwor", address: "Koteshwor Chowk, Ward 32", nearbyCollege: "CCRC", distanceToCollege: 1.2 },
    amenities: ["wifi", "parking", "bathroom_attached", "furnishing", "hot_water"],
    rules: "No pets. Electricity bill separate.",
    isAvailable: true,
    status: "approved",
  },
  {
    title: "Affordable Shared Room for Students — Balkhu",
    description: "Sharing room available for male students near Tribhuvan University. Bed and study table provided. Very affordable rent with water and internet included.",
    roomType: "shared",
    rent: 4500,
    deposit: 3000,
    location: { district: "Kathmandu", area: "Balkhu", address: "Balkhu, near TU Main Gate", nearbyCollege: "Tribhuvan University", distanceToCollege: 0.5 },
    amenities: ["wifi", "kitchen", "water_tank"],
    rules: "Male students only. No visitors after 8 PM.",
    isAvailable: true,
    status: "approved",
  },
  {
    title: "Modern Flat with Balcony — Sanepa",
    description: "Beautiful 2BHK flat with a large balcony overlooking the valley. Fully furnished with modern amenities. Separate kitchen and bathroom. Quiet, residential area.",
    roomType: "flat",
    rent: 25000,
    deposit: 20000,
    location: { district: "Lalitpur", area: "Sanepa", address: "Sanepa Height, Ward 3", nearbyCollege: "Islington College", distanceToCollege: 2.0 },
    amenities: ["wifi", "parking", "kitchen", "bathroom_attached", "hot_water", "furnishing", "balcony", "cctv"],
    rules: "Families or couples preferred. No smoking indoors.",
    isAvailable: true,
    status: "approved",
  },
  {
    title: "Budget Single Room in Thimi, Bhaktapur",
    description: "Clean single room in a peaceful area of Thimi. Suitable for students attending colleges in Bhaktapur. Public bus stop nearby. Water and WiFi included in rent.",
    roomType: "single",
    rent: 5500,
    deposit: 3000,
    location: { district: "Bhaktapur", area: "Thimi", address: "Thimi, Ward 6", nearbyCollege: "Nepal Engineering College", distanceToCollege: 1.5 },
    amenities: ["wifi", "water_tank", "kitchen"],
    rules: "No loud music after 9 PM.",
    isAvailable: true,
    status: "approved",
  },
  {
    title: "Cozy Room near Baneshwor — Girls Only",
    description: "Safe and secure room for female students near New Baneshwor. Landlady stays on premises. Includes attached bathroom and small kitchen corner. CCTV at entrance.",
    roomType: "single",
    rent: 8500,
    deposit: 6000,
    location: { district: "Kathmandu", area: "Baneshwor", address: "New Baneshwor, Ward 10", nearbyCollege: "Shanker Dev Campus", distanceToCollege: 0.8 },
    amenities: ["wifi", "bathroom_attached", "hot_water", "cctv", "water_tank"],
    rules: "Female students only. Gate closes at 9 PM.",
    isAvailable: true,
    status: "approved",
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Do not seed admin/owner/student accounts.
    // Users should be created manually through the app.

    // Seed sample listings only if an owner account already exists.
    const owner = await User.findOne({ role: "owner" });
    const existingCount = await Listing.countDocuments();
    if (owner && existingCount === 0) {
      const listings = SAMPLE_LISTINGS.map((l) => ({ ...l, owner: owner._id }));
      await Listing.insertMany(listings);
      console.log(`✅ ${listings.length} sample listings created`);
    } else if (!owner) {
      console.log("⚠️  No owner account found. Sample listings were not seeded.");
      console.log("    Create an owner account via registration first, then rerun the seed script.");
    } else {
      console.log(`ℹ️  ${existingCount} listings already exist`);
    }

    console.log("\n🎉 Seed complete!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Note: admin, owner, and student users are no longer seeded by this script.");
    console.log("      Please create accounts manually through the app.");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
}

seed();
