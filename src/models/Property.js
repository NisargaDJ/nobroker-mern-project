const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        // Options from the initial property-posting form
        propertyType: {
            type: String,
            enum: ["Residential", "Commercial", "Land/Plot"],
            required: true
        },

        adType: {
            type: String,
            enum: ["Rent", "Resale", "PG/Hostel", "Flatmates", "Sale"],
            required: true
        },

        // Property Details section
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

        status: {
            type: String,
            enum: ["draft", "active"],
            default: "draft"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Property", propertySchema);