const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
    {
        // User who posted the property
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        // Property category
        propertyType: {
            type: String,
            enum: ["Residential", "Commercial", "Land/Plot"],
            required: true
        },

        // Type of advertisement
        adType: {
            type: String,
            enum: ["Rent", "Resale", "PG/Hostel", "Flatmates", "Sale"],
            required: true
        },

        // Property details
        apartmentType: {
            type: String,
            trim: true,
            required: true
        },

        bhkType: {
            type: String,
            trim: true,
            required: true
        },

        floor: {
            type: String,
            trim: true,
            default: ""
        },

        totalFloors: {
            type: String,
            trim: true,
            default: ""
        },

        propertyAge: {
            type: String,
            trim: true,
            default: ""
        },

        facing: {
            type: String,
            trim: true,
            default: ""
        },

        // Location details
        city: {
            type: String,
            trim: true,
            default: "",
            index: true
        },

        locality: {
            type: String,
            trim: true,
            default: "",
            index: true
        },

        landmark: {
            type: String,
            trim: true,
            default: ""
        },

        address: {
            type: String,
            trim: true,
            default: ""
        },

        // Pricing
        price: {
            type: Number,
            min: 0,
            default: null,
            index: true
        },

        // Additional filters
        furnishing: {
            type: String,
            enum: ["Furnished", "Semi-Furnished", "Unfurnished", ""],
            default: ""
        },

        parking: {
            type: Boolean,
            default: false
        },

        available: {
            type: Boolean,
            default: true,
            index: true
        },

        // Map coordinates
        location: {
            latitude: {
                type: Number,
                min: -90,
                max: 90,
                default: null
            },

            longitude: {
                type: Number,
                min: -180,
                max: 180,
                default: null
            }
        },

        // Listing status
        status: {
            type: String,
            enum: ["draft", "active"],
            default: "draft",
            index: true
        }
    },
    {
        timestamps: true
    }
);

// Indexes for common property searches
propertySchema.index({
    status: 1,
    propertyType: 1,
    adType: 1,
    city: 1
});

propertySchema.index({
    city: 1,
    locality: 1,
    price: 1
});

module.exports = mongoose.model("Property", propertySchema);