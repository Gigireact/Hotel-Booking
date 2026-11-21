
require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/configs/db");
const startBookingCleanup = require("./src/jobs/bookingCleanup");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    startBookingCleanup();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup error:", error.message);
    process.exit(1);
  }
};

startServer();