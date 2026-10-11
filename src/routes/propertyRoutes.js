const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");

const {
    createProperty,
    getProperties,
    getMyProperties,
    getPropertyById,
    updateProperty,
    deleteProperty
} = require("../controllers/propertyController");

const router = express.Router();

// Public routes.
router.get("/", getProperties);

// Keep /mine before /:id.
router.get("/mine", authMiddleware, getMyProperties);
router.get("/:id", getPropertyById);

// Authenticated routes.
router.post("/", authMiddleware, createProperty);
router.put("/:id", authMiddleware, updateProperty);
router.delete("/:id", authMiddleware, deleteProperty);

module.exports = router;