
const express = require("express");
const router = express.Router();

const {
  initializePayment,
} = require("../controllers/payment.controller");

const authenticateGuest = require("../middlewares/auth.middleware");
router.post("/initialize", authenticateGuest, initializePayment);

module.exports = router;
