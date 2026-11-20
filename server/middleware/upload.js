const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { verifyImageMagicBytes } = require("../utils/sanitize");

const publicUploadsDir = path.join(__dirname, "..", "uploads");
const privateVerificationsDir = path.join(__dirname, "..", "private_uploads", "verifications");

[publicUploadsDir, privateVerificationsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const ALLOWED_MIME_TO_EXT = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function makeStorage(targetDir) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, targetDir),
    filename: (req, file, cb) => {
      const safeExt = ALLOWED_MIME_TO_EXT[file.mimetype] || ".jpg";
      const randomName = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${safeExt}`;
      cb(null, randomName);
    },
  });
}

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (ALLOWED_MIME_TO_EXT[file.mimetype] && ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only .jpg, .jpeg, .png, and .webp image files are allowed"), false);
  }
};

const uploadLocal = multer({
  storage: makeStorage(publicUploadsDir),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
});

const uploadPrivateDocument = multer({
  storage: makeStorage(privateVerificationsDir),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

/**
 * Post-upload middleware verifying real binary image magic bytes (JPEG/PNG/WebP).
 * Immediately deletes forged files from disk and rejects with 400.
 */
function validateUploadedImages(req, res, next) {
  const files = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);

  if (files.length === 0) return next();

  try {
    for (const file of files) {
      const fd = fs.openSync(file.path, "r");
      const header = Buffer.alloc(16);
      fs.readSync(fd, header, 0, 16, 0);
      fs.closeSync(fd);

      if (!verifyImageMagicBytes(header)) {
        files.forEach((f) => {
          try {
            fs.unlinkSync(f.path);
          } catch {
            // ignore cleanup errors
          }
        });
        return res.status(400).json({
          success: false,
          message: "Uploaded file is not a valid JPEG, PNG, or WebP image",
        });
      }
    }
    return next();
  } catch {
    files.forEach((f) => {
      try {
        fs.unlinkSync(f.path);
      } catch {
        // ignore cleanup errors
      }
    });
    return res.status(400).json({
      success: false,
      message: "Failed to verify uploaded image",
    });
  }
}

module.exports = {
  uploadLocal,
  uploadPrivateDocument,
  validateUploadedImages,
  publicUploadsDir,
  privateVerificationsDir,
};
