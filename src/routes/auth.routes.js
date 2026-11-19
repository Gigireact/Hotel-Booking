const express = require("express");
const router = express.Router();

const {
  registerGuest,
  loginGuest,
} = require("../controllers/auth.controller");

// Guest registration
router.post("/register", registerGuest);

// Guest login
router.post("/login", loginGuest);

module.exports = router;
