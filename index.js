require("dotenv").config(); // Load environment variables
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");

const ParkingLot = require("./models/ParkingLot"); // Import the ParkingLot model

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); // Specify views directory

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes

// Home Route (Optional Welcome Page)
app.get("/", (req, res) => {
  res.render("index", { title: "Welcome to LSU Parking Manager" });
});

// Availability Page (View Lots)
app.get("/availability", async (req, res) => {
  try {
    const lots = await ParkingLot.find();
    res.render("availability", { title: "Parking Lot Availability", lots });
  } catch (error) {
    res.status(500).send("Error fetching parking lot data");
  }
});

// Admin Page (Manage Lots)
app.get("/admin", async (req, res) => {
  try {
    const lots = await ParkingLot.find();
    res.render("admin", { title: "Admin Panel", lots });
  } catch (error) {
    res.status(500).send("Error fetching parking lot data");
  }
});

// Add New Lot (Admin POST API)
app.post("/admin/add", async (req, res) => {
  try {
    const { lotName, availability } = req.body;
    const newLot = new ParkingLot({ lotName, availability });
    await newLot.save();
    res.redirect("/admin");
  } catch (error) {
    res.status(500).send("Error adding new parking lot");
  }
});

// Delete Lot (Admin DELETE API)
app.post("/admin/delete/:id", async (req, res) => {
  try {
    await ParkingLot.findByIdAndDelete(req.params.id);
    res.redirect("/admin");
  } catch (error) {
    res.status(500).send("Error deleting parking lot");
  }
});

// API to Fetch All Lots
app.get("/api/parking", async (req, res) => {
  try {
    const lots = await ParkingLot.find();
    res.json(lots);
  } catch (error) {
    res.status(500).send("Error fetching parking lot data");
  }
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
