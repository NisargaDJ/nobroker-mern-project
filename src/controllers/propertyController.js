const mongoose = require("mongoose");
const Property = require("../models/Property");
const User = require("../models/User");

// Find the logged-in user from the JWT payload.
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

// Validate a positive integer query parameter.
const parsePositiveInteger = (value, defaultValue) => {
    if (value === undefined) {
        return defaultValue;
    }

    if (!/^\d+$/.test(String(value))) {
        return null;
    }

    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed) || parsed < 1) {
        return null;
    }

    return parsed;
};

// Escape user input before using it in a regular expression.
const escapeRegex = (value) => {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// CREATE PROPERTY
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
            city,
            locality,
            landmark,
            address,
            price,
            furnishing,
            parking,
            available,
            location,
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
            city,
            locality,
            landmark,
            address,
            price,
            furnishing,
            parking,
            available,
            location,
            status
        });

        return res.status(201).json({
            message: "Property created successfully",
            property
        });
    } catch (error) {
        if (
            error.name === "ValidationError" ||
            error.name === "CastError"
        ) {
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

// GET ALL PROPERTIES WITH BASIC FILTERS AND PAGINATION
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

        const page = parsePositiveInteger(req.query.page, 1);
        const limit = parsePositiveInteger(req.query.limit, 10);

        if (page === null || limit === null || limit > 100) {
            return res.status(400).json({
                message: "Page must be positive and limit must be between 1 and 100"
            });
        }

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

// SEARCH, FILTER, SORT AND PAGINATE PROPERTIES
const searchProperties = async (req, res) => {
    try {
        const {
            city,
            locality,
            landmark,
            propertyType,
            adType,
            bhkType,
            furnishing,
            parking,
            available,
            minPrice,
            maxPrice,
            sortBy,
            order
        } = req.query;

        const page = parsePositiveInteger(req.query.page, 1);
        const limit = parsePositiveInteger(req.query.limit, 10);

        if (page === null || limit === null || limit > 100) {
            return res.status(400).json({
                message: "Page must be positive and limit must be between 1 and 100"
            });
        }

        // Validate the property category.
        if (
            propertyType &&
            !["Residential", "Commercial", "Land/Plot"].includes(propertyType)
        ) {
            return res.status(400).json({
                message: "Invalid propertyType"
            });
        }

        // Map website search categories to stored ad types.
        if (
            adType &&
            !["Buy", "Rent", "Commercial", "Sale", "Resale",
                "PG/Hostel", "Flatmates"].includes(adType)
        ) {
            return res.status(400).json({
                message: "Invalid adType"
            });
        }

        if (
            adType === "Commercial" &&
            propertyType &&
            propertyType !== "Commercial"
        ) {
            return res.status(400).json({
                message: "Commercial searches require propertyType=Commercial"
            });
        }

        const filter = {
            status: "active"
        };

        if (propertyType) {
            filter.propertyType = propertyType;
        }

        if (adType === "Buy") {
            filter.adType = { $in: ["Sale", "Resale"] };
        } else if (adType === "Commercial") {
            filter.propertyType = "Commercial";
        } else if (adType) {
            filter.adType = adType;
        }

        // Search by city, locality and landmark.
        if (city) {
            filter.city = {
                $regex: escapeRegex(city.trim()),
                $options: "i"
            };
        }

        if (locality) {
            filter.locality = {
                $regex: escapeRegex(locality.trim()),
                $options: "i"
            };
        }

        if (landmark) {
            filter.landmark = {
                $regex: escapeRegex(landmark.trim()),
                $options: "i"
            };
        }

        if (bhkType) {
            filter.bhkType = bhkType;
        }

        if (furnishing) {
            if (
                !["Furnished", "Semi-Furnished", "Unfurnished"].includes(
                    furnishing
                )
            ) {
                return res.status(400).json({
                    message: "Invalid furnishing value"
                });
            }

            filter.furnishing = furnishing;
        }

        if (parking !== undefined) {
            if (!["true", "false"].includes(parking)) {
                return res.status(400).json({
                    message: "parking must be true or false"
                });
            }

            filter.parking = parking === "true";
        }

        if (available !== undefined) {
            if (!["true", "false"].includes(available)) {
                return res.status(400).json({
                    message: "available must be true or false"
                });
            }

            filter.available = available === "true";
        }

        // Validate and apply the price range.
        if (minPrice !== undefined || maxPrice !== undefined) {
            const min = Number(minPrice);
            const max = Number(maxPrice);

            if (
                (minPrice !== undefined &&
                    (minPrice.trim() === "" ||
                        !Number.isFinite(min) ||
                        min < 0)) ||
                (maxPrice !== undefined &&
                    (maxPrice.trim() === "" ||
                        !Number.isFinite(max) ||
                        max < 0))
            ) {
                return res.status(400).json({
                    message: "Price values must be valid non-negative numbers"
                });
            }

            if (
                minPrice !== undefined &&
                maxPrice !== undefined &&
                min > max
            ) {
                return res.status(400).json({
                    message: "minPrice cannot be greater than maxPrice"
                });
            }

            filter.price = {};

            if (minPrice !== undefined) {
                filter.price.$gte = min;
            }

            if (maxPrice !== undefined) {
                filter.price.$lte = max;
            }
        }

        // Allow only supported sorting fields.
        const allowedSortFields = ["price", "createdAt"];

        const selectedSort = sortBy || "createdAt";
        const selectedOrder = order || "desc";

        if (!allowedSortFields.includes(selectedSort)) {
            return res.status(400).json({
                message: "sortBy must be price or createdAt"
            });
        }

        if (!["asc", "desc"].includes(selectedOrder)) {
            return res.status(400).json({
                message: "order must be asc or desc"
            });
        }

        const sortDirection = selectedOrder === "asc" ? 1 : -1;
        const skip = (page - 1) * limit;

        const [properties, total] = await Promise.all([
            Property.find(filter)
                .populate("owner", "name email")
                .sort({
                    [selectedSort]: sortDirection,
                    _id: 1
                })
                .skip(skip)
                .limit(limit)
                .lean(),

            Property.countDocuments(filter)
        ]);

        return res.status(200).json({
            message: "Properties retrieved successfully",
            filters: req.query,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            properties
        });
    } catch (error) {
        console.error("Search properties error:", error);

        return res.status(500).json({
            message: "Failed to search properties"
        });
    }
};

// GET THE LOGGED-IN OWNER'S PROPERTIES
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

// GET ONE PROPERTY BY ID
const getPropertyById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid property ID"
            });
        }

        const property = await Property.findOne({
            _id: id,
            status: "active"
        }).populate("owner", "name email");

        if (!property) {
            return res.status(404).json({
                message: "Property not found"
            });
        }

        return res.status(200).json({
            property
        });
    } catch (error) {
        console.error("Get property error:", error);

        return res.status(500).json({
            message: "Failed to retrieve property"
        });
    }
};

// UPDATE ONLY A PROPERTY OWNED BY THE LOGGED-IN USER
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
            "city",
            "locality",
            "landmark",
            "address",
            "price",
            "furnishing",
            "parking",
            "available",
            "location",
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
                message: "Property not found or you are not its owner"
            });
        }

        return res.status(200).json({
            message: "Property updated successfully",
            property
        });
    } catch (error) {
        if (
            error.name === "ValidationError" ||
            error.name === "CastError"
        ) {
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

// DELETE ONLY A PROPERTY OWNED BY THE LOGGED-IN USER
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
                message: "Property not found or you are not its owner"
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
    searchProperties,
    getMyProperties,
    getPropertyById,
    updateProperty,
    deleteProperty
};