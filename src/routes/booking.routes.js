
const express = require("express");
const router = express.Router();

const {
  createBooking,
  getMyBookings,
  getRoomAccessCode,
  completePreArrivalCheckIn,
} = require("../controllers/booking.controller");

const {
  warmUpIdCheck,
  verifyGuestId,
} = require("../controllers/idVerification.controller");

const authenticateGuest = require("../middlewares/auth.middleware");
const uploadIdPhoto = require("../middlewares/idUpload.middleware");

router.post("/", authenticateGuest, createBooking);
router.get("/my-bookings", authenticateGuest, getMyBookings);
router.get("/:bookingId/room-code", authenticateGuest, getRoomAccessCode);

// Warm up the ID verification service
router.post(
  "/:bookingId/id-verification/warm",
  authenticateGuest,
  warmUpIdCheck
);

// Upload and verify guest ID
router.post(
  "/:bookingId/id-verification",
  authenticateGuest,
  uploadIdPhoto,
  verifyGuestId
);

router.patch(
  "/:bookingId/pre-arrival-check-in",
  authenticateGuest,
  completePreArrivalCheckIn
);

module.exports = router;
