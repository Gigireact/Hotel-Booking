const express = require("express");
const router = express.Router();

const {
  getAllHotels,
  getHotelById,
} = require("../controllers/hotel.controller");

router.post("/", createHotel);
router.get("/", getAllHotels);
router.get("/:id", getHotelById);

module.exports = router;
