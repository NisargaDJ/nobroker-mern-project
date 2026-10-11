const mongoose = require("mongoose");
const Property = require("../models/Property");
const User = require("../models/User");

// Find the logged-in user from the existing JWT payload.
const getLoggedInUser = async (req) => {
    const decoded = req.user || {};

    const possibleId =
        decoded.userId ||
        decoded.id ||
        decoded._id ||
        decoded.sub ||
        (decoded.user && (decoded.user.id || decoded.user._id));

    let user = null;

    if (
        possibleId &&
        mongoose.Types.ObjectId.isValid(String(possibleId))
    ) {
        user = await User.findById(possibleId);
    }

    // Support tokens that identify the user by phone number.
    if (!user) {
        const phone =
            decoded.phone ||
            (decoded.user && decoded.user.phone);

        if (phone) {
            user = await User.findOne({ phone });
        }
    }

    return user;
};

// Create a property.
const createProperty = async (req, res) => {
    try {
        const {
            propertyType,
            adType,
            apartmentType,
            bhkType,
            floor,
            totalFloors,
            propertyAge,
            facing,
            status
        } = req.body;

        if (
            !propertyType ||
            !adType ||
            !apartmentType ||
            !bhkType
        ) {
            return res.status(400).json({
                message:
                    "Property Type, Ad Type, Apartment Type and BHK Type are required"
            });
        }

        const user = await getLoggedInUser(req);

        if (!user) {
            return res.status(401).json({
                message: "Authenticated user not found"
            });
        }

        const property = await Property.create({
            owner: user._id,
            propertyType,
            adType,
            apartmentType,
            bhkType,
            floor,
            totalFloors,
            propertyAge,
            facing,
            status
        });

        return res.status(201).json({
            message: "Property created successfully",
            property
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: error.message
            });
        }

        console.error("Create property error:", error);

        return res.status(500).json({
            message: "Failed to create property"
        });
    }
};

// Get properties with optional filters and pagination.
const getProperties = async (req, res) => {
    try {
        const filter = {};

        if (req.query.propertyType) {
            filter.propertyType = req.query.propertyType;
        }

        if (req.query.adType) {
            filter.adType = req.query.adType;
        }

        if (req.query.status) {
            filter.status = req.query.status;
        }

        const page = Math.max(
            1,
            parseInt(req.query.page, 10) || 1
        );

        const limit = Math.min(
            100,
            Math.max(1, parseInt(req.query.limit, 10) || 10)
        );

        const skip = (page - 1) * limit;

        const [properties, total] = await Promise.all([
            Property.find(filter)
                .populate("owner", "name email")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),

            Property.countDocuments(filter)
        ]);

        return res.status(200).json({
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            properties
        });
    } catch (error) {
        console.error("Get properties error:", error);

        return res.status(500).json({
            message: "Failed to retrieve properties"
        });
    }
};

// Get the logged-in owner's properties.
const getMyProperties = async (req, res) => {
    try {
        const user = await getLoggedInUser(req);

        if (!user) {
            return res.status(401).json({
                message: "Authenticated user not found"
            });
        }

        const properties = await Property.find({
            owner: user._id
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            count: properties.length,
            properties
        });
    } catch (error) {
        console.error("Get my properties error:", error);

        return res.status(500).json({
            message: "Failed to retrieve your properties"
        });
    }
};

// Get one property by its MongoDB ID.
const getPropertyById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid property ID"
            });
        }

        const property = await Property.findById(id)
            .populate("owner", "name email");

        if (!property) {
            return res.status(404).json({
                message: "Property not found"
            });
        }

        return res.status(200).json({ property });
    } catch (error) {
        console.error("Get property error:", error);

        return res.status(500).json({
            message: "Failed to retrieve property"
        });
    }
};

// Update only a property owned by the logged-in user.
const updateProperty = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid property ID"
            });
        }

        const user = await getLoggedInUser(req);

        if (!user) {
            return res.status(401).json({
                message: "Authenticated user not found"
            });
        }

        const allowedFields = [
            "propertyType",
            "adType",
            "apartmentType",
            "bhkType",
            "floor",
            "totalFloors",
            "propertyAge",
            "facing",
            "status"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                message: "Provide at least one field to update"
            });
        }

        const property = await Property.findOneAndUpdate(
            {
                _id: id,
                owner: user._id
            },
            updates,
            {
                new: true,
                runValidators: true
            }
        );

        if (!property) {
            return res.status(404).json({
                message:
                    "Property not found or you are not its owner"
            });
        }

        return res.status(200).json({
            message: "Property updated successfully",
            property
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: error.message
            });
        }

        console.error("Update property error:", error);

        return res.status(500).json({
            message: "Failed to update property"
        });
    }
};

// Delete only a property owned by the logged-in user.
const deleteProperty = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid property ID"
            });
        }

        const user = await getLoggedInUser(req);

        if (!user) {
            return res.status(401).json({
                message: "Authenticated user not found"
            });
        }

        const property = await Property.findOneAndDelete({
            _id: id,
            owner: user._id
        });

        if (!property) {
            return res.status(404).json({
                message:
                    "Property not found or you are not its owner"
            });
        }

        return res.status(200).json({
            message: "Property deleted successfully"
        });
    } catch (error) {
        console.error("Delete property error:", error);

        return res.status(500).json({
            message: "Failed to delete property"
        });
    }
};

module.exports = {
    createProperty,
    getProperties,
    getMyProperties,
    getPropertyById,
    updateProperty,
    deleteProperty
};