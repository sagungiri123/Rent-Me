const express = require("express");
const router = express.Router();
const { getProfile, updateProfile, getSavedListings, toggleSaveListing, getMyListings, submitVerification } = require("../controllers/userController");
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/role");
const { uploadLocal } = require("../middleware/upload");

router.get("/profile", protect, getProfile);
router.put("/profile", protect, uploadLocal.single("avatar"), updateProfile);
router.post("/verification", protect, authorize("owner"), uploadLocal.single("document"), submitVerification);
router.get("/saved", protect, authorize("student"), getSavedListings);
router.post("/saved/:listingId", protect, authorize("student"), toggleSaveListing);
router.get("/my-listings", protect, authorize("owner"), getMyListings);

module.exports = router;
