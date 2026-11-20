const express = require("express");
const router = express.Router();
const {
  createListing,
  getListings,
  getListing,
  updateListing,
  toggleAvailability,
  deleteListing,
  revealContact,
} = require("../controllers/listingController");
const { protect, optionalAuth } = require("../middleware/auth");
const { authorize } = require("../middleware/role");
const { uploadLocal, validateUploadedImages } = require("../middleware/upload");
const { writeLimiter } = require("../middleware/security");

router.get("/", getListings);
router.get("/:id", optionalAuth, getListing);
router.post(
  "/",
  protect,
  authorize("owner"),
  writeLimiter,
  uploadLocal.array("photos", 8),
  validateUploadedImages,
  createListing
);
router.put(
  "/:id",
  protect,
  authorize("owner"),
  writeLimiter,
  uploadLocal.array("photos", 8),
  validateUploadedImages,
  updateListing
);
router.patch("/:id/availability", protect, authorize("owner"), writeLimiter, toggleAvailability);
router.delete("/:id", protect, authorize("owner", "admin"), writeLimiter, deleteListing);
router.post("/:id/contact", protect, authorize("student"), writeLimiter, revealContact);

module.exports = router;
