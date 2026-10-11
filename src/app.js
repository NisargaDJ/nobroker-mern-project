const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const propertyRoutes = require("./routes/propertyRoutes");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);

// Test route
app.get("/", (req, res) => {
    res.send("NoBroker Backend Server is Running");
});

// Handle unknown routes.
app.use((req, res) => {
    res.status(404).json({
        message: "Route not found"
    });
});

module.exports = app;