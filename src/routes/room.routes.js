
const express = require("express");
const router = express.Router();

const {
  createRoom,
  getHotelRooms,
  checkRoomAvailability,
} = require("../controllers/room.controller");

const upload = require("../configs/cloudinaryStorage");
// Create room with up to 5 images
router.post("/", upload.array("images", 5), createRoom);
router.get("/hotel/:hotelId", getHotelRooms);
router.get("/hotel/:hotelId/availability", checkRoomAvailability);

module.exports = router;
