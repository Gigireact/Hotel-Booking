
const express = require("express");
const router = express.Router();

const {
  initializePayment,
  verifyPayment,
  paystackWebhook,
} = require("../controllers/payment.controller");

const authenticateGuest = require("../middlewares/auth.middleware");
router.post("/webhook", paystackWebhook);
router.post("/initialize", authenticateGuest, initializePayment);
router.post("/verify", authenticateGuest, verifyPayment);

module.exports = router;
