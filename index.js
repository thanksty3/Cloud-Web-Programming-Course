require("dotenv").config(); // Load environment variables
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

const ParkingLot = require("./models/ParkingLot"); // Import the ParkingLot model

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); // Specify views directory
app.use(express.static("public")); // Serve static files like CSS

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Scrape Data from LSU Parking Page
async function scrapeParkingData() {
  try {
    const url = "https://www.lsu.edu/parking/availability.php";
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const lots = [];

    $("table tbody tr").each((index, element) => {
      const lotName = $(element).find("td:nth-child(1)").text().trim();
      const availability = $(element).find("td:nth-child(2)").text().trim();
      if (lotName && availability) {
        lots.push({ lotName, availability });
      }
    });

    // Clear existing data and insert new data
    await ParkingLot.deleteMany({});
    await ParkingLot.insertMany(lots);
    console.log("Parking lot data updated successfully");
  } catch (error) {
    console.error("Error scraping parking lot data:", error);
  }
}

// Routes

// Home Route (Welcome Page)
app.get("/", (req, res) => {
  res.render("index", { title: "Welcome to LSU Parking Manager" });
});

// Availability Page (View Lots)
app.get("/availability", async (req, res) => {
  try {
    const lots = await ParkingLot.find(); // Fetch parking lot data from MongoDB
    res.render("availability", { lots }); // Pass data to the EJS template
  } catch (error) {
    console.error("Error fetching parking lot data:", error);
    res.status(500).send("Internal Server Error");
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

// Scrape Route (Optional for Manual Data Update)
app.get("/scrape", async (req, res) => {
  try {
    await scrapeParkingData();
    res.redirect("/availability");
  } catch (error) {
    console.error("Error during scraping:", error);
    res.status(500).send("Error updating parking lot data");
  }
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server started at http://localhost:${PORT}`);
  await scrapeParkingData(); // Automatically scrape data on server start
});
