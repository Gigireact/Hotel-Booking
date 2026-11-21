const express = require("express");
const router = express.Router();

const {
  createRoom,
  addRoomImages,
  getHotelRooms,
  checkRoomAvailability,
} = require("../controllers/room.controller");

const upload = require("../configs/cloudinaryStorage");

// Create room with up to 5 images
router.post("/", upload.array("images", 5), createRoom);

// Add images to an existing room
router.patch("/:roomId/images", upload.array("images", 5), addRoomImages);

// Get all rooms in a hotel
router.get("/hotel/:hotelId", getHotelRooms);

// Check room availability
router.get("/hotel/:hotelId/availability", checkRoomAvailability);

module.exports = router;