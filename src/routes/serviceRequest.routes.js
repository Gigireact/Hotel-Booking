
const express = require("express");
const router = express.Router();

const {
  createServiceRequest,
  getMyServiceRequests,
} = require("../controllers/serviceRequest.controller");

const authenticateGuest = require("../middlewares/auth.middleware");

router.post("/", authenticateGuest, createServiceRequest);
router.get("/my-requests", authenticateGuest, getMyServiceRequests);

module.exports = router;
