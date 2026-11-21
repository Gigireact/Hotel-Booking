const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const {
  generalLimiter,
  authLimiter,
  paymentLimiter,
} = require("./middlewares/rateLimiter");

const authRoutes = require("./routes/auth.routes");
const guestRoutes = require("./routes/guest.routes");
const hotelRoutes = require("./routes/hotel.routes");
const roomRoutes = require("./routes/room.routes");
const bookingRoutes = require("./routes/booking.routes");
const paymentRoutes = require("./routes/payment.routes.js");

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(
  express.json({
    limit: "100kb",
    verify: (req, res, buffer) => {
      if (req.originalUrl.split("?")[0] === "/api/payment/webhook") {
        req.rawBody = Buffer.from(buffer);
      }
    },
  })
);
app.use(morgan("dev"));

app.use("/api", generalLimiter);

app.use("/api/auth", authLimiter);
app.use("/api/payment/initialize", paymentLimiter);
app.use("/api/payment/verify", paymentLimiter);

// Authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/guests", guestRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payment", paymentRoutes);


app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Sprint Backend - Digital Guest Experience Platform",
  });
});

module.exports = app;