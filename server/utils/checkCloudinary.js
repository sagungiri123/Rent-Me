const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

[path.join(__dirname, "..", "..", ".env"), path.join(__dirname, "..", ".env")].forEach(
  (envPath) => {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: true });
    }
  }
);

const { cloudinary, initCloudinary, isCloudinaryConfigured } = require("../config/cloudinary");

async function checkCloudinary() {
  console.log("Checking Cloudinary configuration...\n");

  if (!isCloudinaryConfigured()) {
    console.error("❌ Cloudinary is NOT configured in .env!");
    console.log("Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.\n");
    process.exit(1);
  }

  initCloudinary();
  const config = cloudinary.config();
  console.log(`Cloud Name : ${config.cloud_name}`);
  console.log(`API Key    : ${config.api_key}`);

  // Test ping
  try {
    const pingRes = await cloudinary.api.ping();
    console.log("✅ Cloudinary Ping:", pingRes.status || "ok");
  } catch (err) {
    console.error("❌ Cloudinary Ping failed:", err.message);
  }

  // Test actual image upload
  console.log("\nTesting test image upload to Cloudinary...");
  const dummy1x1Png =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  try {
    const uploadRes = await cloudinary.uploader.upload(dummy1x1Png, {
      folder: "rentme/test",
      public_id: `test_${Date.now()}`,
    });
    console.log("🎉 UPLOAD SUCCESSFUL!");
    console.log(`Uploaded Image URL: ${uploadRes.secure_url}`);

    // Clean up test image
    await cloudinary.uploader.destroy(uploadRes.public_id).catch(() => {});
    console.log("Test image cleaned up.");
    console.log("\n✅ Your Cloudinary credentials have full write/upload permissions!");
  } catch (err) {
    console.error("\n❌ UPLOAD FAILED:", err.message);
    if (err.http_code === 403 || (err.message && err.message.includes("403"))) {
      console.log("\n💡 Why this failed:");
      console.log("   Cloudinary rejected the upload because your API Key is missing the 'create' (upload) permission.");
      console.log("   In Cloudinary Console -> Settings -> Access Keys, ensure your key has 'Upload / Create' (Full Access) enabled,");
      console.log("   or copy the master CLOUDINARY_URL from your Cloudinary Dashboard homepage into .env.\n");
    }
  }
}

checkCloudinary();
