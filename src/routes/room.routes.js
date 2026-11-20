const express = require("express");
const router = express.Router();

const {
  createRoom,
  getHotelRooms,
  checkRoomAvailability,
} = require("../controllers/room.controller");

router.post("/", createRoom);
router.get("/hotel/:hotelId", getHotelRooms);
router.get("/hotel/:hotelId/availability", checkRoomAvailability);
module.exports = router;
