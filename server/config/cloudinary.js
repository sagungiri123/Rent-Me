const cloudinary = require("cloudinary").v2;
const fs = require("fs");

function isCloudinaryConfigured() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_URL } = process.env;

  if (CLOUDINARY_URL && CLOUDINARY_URL.trim() && !CLOUDINARY_URL.includes("your_")) {
    return true;
  }

  return Boolean(
    CLOUDINARY_CLOUD_NAME &&
    CLOUDINARY_CLOUD_NAME.trim() &&
    !CLOUDINARY_CLOUD_NAME.includes("your_") &&
    CLOUDINARY_API_KEY &&
    CLOUDINARY_API_KEY.trim() &&
    !CLOUDINARY_API_KEY.includes("your_") &&
    CLOUDINARY_API_SECRET &&
    CLOUDINARY_API_SECRET.trim() &&
    !CLOUDINARY_API_SECRET.includes("your_")
  );
}


function initCloudinary() {
  if (process.env.CLOUDINARY_URL && process.env.CLOUDINARY_URL.trim() && !process.env.CLOUDINARY_URL.includes("your_")) {
    cloudinary.config({ secure: true });
  } else if (isCloudinaryConfigured()) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
      api_key: process.env.CLOUDINARY_API_KEY.trim(),
      api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
      secure: true,
    });
  }
  return cloudinary;
}



// @param {string} filePath 
// @param {object} [options] 
// @returns {Promise<{ url: string, secureUrl: string, publicId: string }>}

async function uploadToCloudinary(filePath, options = {}) {
  initCloudinary();

  const { deleteLocalFile = true, ...cloudinaryOptions } = options;
  const folder = cloudinaryOptions.folder || "rentme/listings";
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: "image",
    ...cloudinaryOptions,
  });

  // Automatically clean up the temporary local file if requested (default: true)
  if (deleteLocalFile !== false) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupErr) {
      console.warn("[Cloudinary] Warning: Could not remove local temp file:", cleanupErr.message);
    }
  }

  return {
    url: result.secure_url || result.url,
    secureUrl: result.secure_url || result.url,
    publicId: result.public_id,
  };
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  initCloudinary,
  uploadToCloudinary,
};
