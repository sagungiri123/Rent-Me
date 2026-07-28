const express = require("express");
const router = express.Router();
const {
  getVerifications, reviewVerification, getAdminListings,
  reviewListing, getUsers, toggleSuspendUser, getAnalytics,
} = require("../controllers/adminController");
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/role");

// All admin routes require auth + admin role
router.use(protect, authorize("admin"));

router.get("/verifications", getVerifications);
router.put("/verifications/:id", reviewVerification);
router.get("/listings", getAdminListings);
router.put("/listings/:id/status", reviewListing);
router.get("/users", getUsers);
router.put("/users/:id/suspend", toggleSuspendUser);
router.get("/analytics", getAnalytics);

module.exports = router;
