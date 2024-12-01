const mongoose = require("mongoose");

const parkingSchema = new mongoose.Schema({
  lotName: { type: String, required: true },
  availability: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ParkingLot", parkingSchema);
