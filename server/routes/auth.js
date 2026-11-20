const express = require("express");
const router = express.Router();
const { register, login, googleAuth, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { authLimiter } = require("../middleware/security");

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/google", authLimiter, googleAuth);
router.get("/me", protect, getMe);

module.exports = router;
