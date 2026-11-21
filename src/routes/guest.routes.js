
const express = require("express");
const router = express.Router();

const {
  getGuestProfile,
  getLoyaltyPoints,
} = require("../controllers/guest.controller");

const authenticateGuest = require("../middlewares/auth.middleware");

router.get("/profile", authenticateGuest, getGuestProfile);
router.get("/points", authenticateGuest, getLoyaltyPoints);

module.exports = router;
