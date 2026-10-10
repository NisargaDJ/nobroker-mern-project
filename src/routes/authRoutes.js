
const express = require("express");

const {
    requestOTP,
    verifyOTP,
    updateProfile,
    getProfile
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Request OTP
router.post("/request-otp", requestOTP);

// Verify OTP and register/login
router.post("/verify-otp", verifyOTP);

// Get logged-in user's profile
router.get("/profile", authMiddleware, getProfile);

// Complete or update profile
router.put("/profile", authMiddleware, updateProfile);

module.exports = router;