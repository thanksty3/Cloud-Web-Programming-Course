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
  .then(() => console.log("\x1b[32mMongoDB connected successfully\x1b[0m")) // Styled console log
  .catch((err) =>
    console.error("\x1b[31mMongoDB connection error:\x1b[0m", err)
  );


async function scrapeParkingData() {
  console.log("\x1b[36mStarting data scraping process...\x1b[0m"); // Styled log
  try {
    const url = "https://www.lsu.edu/parking/availability.php";
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const lots = [];

    $("table tbody tr").each((index, element) => {
      const lotName = $(element).find("td:nth-child(1)").text().trim();
      const availability = $(element).find("td:nth-child(3)").text().trim();
      if (lotName && availability) {
        lots.push({ lotName, availability });
      }
    });

    console.log(`\x1b[33mScraped ${lots.length} parking lots.\x1b[0m`);

    // Clear existing data and insert new data
    await ParkingLot.deleteMany({});
    const result = await ParkingLot.insertMany(lots);
    console.log(`\x1b[32mInserted ${result.length} lots into MongoDB\x1b[0m`);
  } catch (error) {
    console.error("\x1b[31mError scraping parking lot data:\x1b[0m", error);
  }
}

// Home Route 
app.get("/", (req, res) => {
  res.render("index", { title: "Welcome to LSU Parking Manager" });
});

// Availability Page
app.get("/availability", async (req, res) => {
  try {
    const { lotName, availability } = req.query; // Get query parameters
    const filter = {};

    if (lotName) {
      filter.lotName = new RegExp(lotName, "i"); // Case-insensitive partial match
    }

    if (availability) {
      filter.availability = { $gte: `${availability}%` }; // Matches availability >= input percentage
    }

    const lots = await ParkingLot.find(filter); // Fetch filtered data from MongoDB
    res.render("availability", { lots }); 
  } catch (error) {
    console.error("\x1b[31mError fetching parking lot data:\x1b[0m", error);
    res.status(500).send("Internal Server Error");
  }
});


// Admin Page 
app.get("/admin", async (req, res) => {
  try {
    const lots = await ParkingLot.find();
    res.render("admin", { title: "Admin Panel", lots });
  } catch (error) {
    res.status(500).send("Error fetching parking lot data");
  }
});

// Add New Lot
app.post("/admin/add", async (req, res) => {
  try {
    const { lotName, availability } = req.body;
    const newLot = new ParkingLot({ lotName, availability });
    await newLot.save();
    console.log(`\x1b[32mAdded new lot: ${lotName} - ${availability}\x1b[0m`);
    res.redirect("/admin");
  } catch (error) {
    console.error("\x1b[31mError adding new parking lot:\x1b[0m", error);
    res.status(500).send("Error adding new parking lot");
  }
});

// Delete Lot (Admin DELETE API)
app.post("/admin/delete/:id", async (req, res) => {
  try {
    await ParkingLot.findByIdAndDelete(req.params.id);
    console.log(`\x1b[33mDeleted lot with ID: ${req.params.id}\x1b[0m`);
    res.redirect("/admin");
  } catch (error) {
    console.error("\x1b[31mError deleting parking lot:\x1b[0m", error);
    res.status(500).send("Error deleting parking lot");
  }
});

// API to Fetch All Lots
app.get("/api/parking", async (req, res) => {
  try {
    const lots = await ParkingLot.find();
    res.json(lots);
  } catch (error) {
    console.error("\x1b[31mError fetching parking lot data:\x1b[0m", error);
    res.status(500).send("Error fetching parking lot data");
  }
});

// Scrape Route (Optional for Manual Data Update)
app.get("/scrape", async (req, res) => {
  try {
    await scrapeParkingData();
    res.redirect("/availability");
  } catch (error) {
    console.error("\x1b[31mError during scraping:\x1b[0m", error);
    res.status(500).send("Error updating parking lot data");
  }
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`\x1b[34mServer started at http://localhost:${PORT}\x1b[0m`);
  await scrapeParkingData(); // Automatically scrape data on server start
});
