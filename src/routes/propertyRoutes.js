const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");

const {
    createProperty,
    getProperties,
    searchProperties,
    getMyProperties,
    getPropertyById,
    updateProperty,
    deleteProperty
} = require("../controllers/propertyController");

const router = express.Router();

// Public search route.
// IMPORTANT: Place /search before /:id.
router.get("/search", searchProperties);

// Public routes.
router.get("/", getProperties);

// Authenticated route to get the logged-in user's properties.
router.get("/mine", authMiddleware, getMyProperties);

// Get property details by ID.
router.get("/:id", getPropertyById);

// Create a property.
router.post("/", authMiddleware, createProperty);

// Update a property.
router.put("/:id", authMiddleware, updateProperty);

// Delete a property.
router.delete("/:id", authMiddleware, deleteProperty);

module.exports = router;