const express = require("express");
const router = express.Router();
const {
  getVerifications,
  getVerificationDocument,
  reviewVerification,
  getAdminListings,
  reviewListing,
  getUsers,
  toggleSuspendUser,
  getAnalytics,
} = require("../controllers/adminController");
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/role");
const { adminLimiter } = require("../middleware/security");

// All admin routes require strict JWT auth + admin role + admin rate limiter
router.use(adminLimiter, protect, authorize("admin"));

router.get("/verifications", getVerifications);
router.get("/verifications/:id/document", getVerificationDocument);
router.put("/verifications/:id", reviewVerification);
router.get("/listings", getAdminListings);
router.put("/listings/:id/status", reviewListing);
router.get("/users", getUsers);
router.put("/users/:id/suspend", toggleSuspendUser);
router.get("/analytics", getAnalytics);

module.exports = router;
