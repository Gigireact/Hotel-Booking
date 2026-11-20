
const express = require("express");
const router = express.Router();

const {
  createBooking,
  getMyBookings,
} = require("../controllers/booking.controller");

const authenticateGuest = require("../middlewares/auth.middleware");

router.post("/", authenticateGuest, createBooking);
router.get("/my-bookings", authenticateGuest, getMyBookings);

module.exports = router;
