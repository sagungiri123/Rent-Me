const express = require("express");
const router = express.Router();
const {
  getProfile,
  updateProfile,
  getSavedListings,
  toggleSaveListing,
  getMyListings,
  submitVerification,
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/role");
const {
  uploadLocal,
  uploadPrivateDocument,
  validateUploadedImages,
  uploadToCloudinaryIfConfigured,
} = require("../middleware/upload");
const { writeLimiter } = require("../middleware/security");

router.get("/profile", protect, getProfile);
router.put(
  "/profile",
  protect,
  writeLimiter,
  uploadLocal.single("avatar"),
  validateUploadedImages,
  uploadToCloudinaryIfConfigured("rentme/avatars"),
  updateProfile
);
router.post(
  "/verification",
  protect,
  authorize("owner"),
  writeLimiter,
  uploadPrivateDocument.single("document"),
  validateUploadedImages,
  submitVerification
);
router.get("/saved", protect, authorize("student"), getSavedListings);
router.post("/saved/:listingId", protect, authorize("student"), writeLimiter, toggleSaveListing);
router.get("/my-listings", protect, authorize("owner"), getMyListings);

module.exports = router;
