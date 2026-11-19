const express = require("express");
const router = express.Router();

const { getGuestProfile } = require("../controllers/guest.controller");
const authenticateGuest = require("../middlewares/auth.middleware");

router.get("/profile", authenticateGuest, getGuestProfile);

module.exports = router;
