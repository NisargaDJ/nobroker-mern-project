
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Temporary in-memory OTP storage for development only.
// OTPs are lost when the server restarts.
const otpStore = new Map();

// Request OTP
const requestOTP = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone || !/^\d{10}$/.test(phone)) {
            return res.status(400).json({
                message: "Enter a valid 10-digit mobile number"
            });
        }

        const otp = crypto.randomInt(100000, 1000000).toString();

        otpStore.set(phone, {
            otp,
            expiresAt: Date.now() + 5 * 60 * 1000
        });

        // Development only: show OTP in the response.
        // Use an SMS provider for real OTP delivery.
        return res.status(200).json({
            message: "OTP generated successfully",
            developmentOTP: otp,
            expiresIn: "5 minutes"
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to generate OTP"
        });
    }
};

// Verify OTP and log in or register
const verifyOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({
                message: "Phone number and OTP are required"
            });
        }

        const savedOTP = otpStore.get(phone);

        if (!savedOTP || savedOTP.expiresAt < Date.now()) {
            otpStore.delete(phone);

            return res.status(400).json({
                message: "OTP is invalid or expired"
            });
        }

        if (savedOTP.otp !== String(otp)) {
            return res.status(400).json({
                message: "Incorrect OTP"
            });
        }

        otpStore.delete(phone);

        let user = await User.findOne({ phone });
        const isNewUser = !user;

        if (!user) {
            user = await User.create({
                phone,
                phoneVerified: true
            });
        } else {
            user.phoneVerified = true;
            await user.save();
        }

        const token = jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        return res.status(200).json({
            message: "OTP verified successfully",
            isNewUser,
            requiresProfile: !user.name || !user.email,
            token,
            user: {
                id: user._id,
                phone: user.phone,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: "OTP verification failed"
        });
    }
};

// Complete or update profile
const updateProfile = async (req, res) => {
    try {
        const { name, email } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof email !== "string" ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ) {
            return res.status(400).json({
                message: "Valid name and email are required"
            });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        user.name = name.trim();
        user.email = email.trim().toLowerCase();

        await user.save();

        return res.status(200).json({
            message: "Profile saved successfully",
            user: {
                id: user._id,
                phone: user.phone,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "This email is already registered"
            });
        }

        return res.status(500).json({
            message: "Failed to save profile"
        });
    }
};

// Get logged-in user's profile
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select("-__v");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({
            message: "Profile fetched successfully",
            user
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch profile"
        });
    }
};

module.exports = {
    requestOTP,
    verifyOTP,
    updateProfile,
    getProfile
};