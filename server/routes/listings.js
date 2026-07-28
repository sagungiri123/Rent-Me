const express = require("express");
const router = express.Router();
const {
  createListing, getListings, getListing, updateListing,
  toggleAvailability, deleteListing, revealContact,
} = require("../controllers/listingController");
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/role");
const { uploadLocal } = require("../middleware/upload");

router.get("/", getListings);
router.get("/:id", getListing);
router.post("/", protect, authorize("owner"), uploadLocal.array("photos", 8), createListing);
router.put("/:id", protect, authorize("owner"), uploadLocal.array("photos", 8), updateListing);
router.patch("/:id/availability", protect, authorize("owner"), toggleAvailability);
router.delete("/:id", protect, authorize("owner", "admin"), deleteListing);
router.post("/:id/contact", protect, authorize("student"), revealContact);

module.exports = router;
