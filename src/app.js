const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/auth.routes");
const guestRoutes = require("./routes/guest.routes");
const hotelRoutes = require("./routes/hotel.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/guests", guestRoutes);
app.use("/api/hotels", hotelRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Sprint Backend - Digital Guest Experience Platform",
  });
});

module.exports = app;