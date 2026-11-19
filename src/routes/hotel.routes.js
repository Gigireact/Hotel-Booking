const express = require("express");
const router = express.Router();

const {
  createHotel,
  getAllHotels,
  getHotelById,
} = require("../controllers/hotel.controller");

// Create a hotel
router.post("/", createHotel);

// Get all hotels and search hotels
router.get("/", getAllHotels);

// Get a single hotel
router.get("/:id", getHotelById);

module.exports = router;
