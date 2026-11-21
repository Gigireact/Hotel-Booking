
const cron = require("node-cron");
const Booking = require("../models/booking.model");

const startBookingCleanup = () => {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      const result = await Booking.updateMany(
        {
          bookingStatus: "Pending",
          expiresAt: { $lte: new Date() },
        },
        {
          $set: { bookingStatus: "Cancelled" },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(
          `Booking cleanup: ${result.modifiedCount} expired booking(s) cancelled.`
        );
      }
    } catch (error) {
      console.error("Booking cleanup error:", error.message);
    }
  });

  console.log("Booking cleanup job started.");
};

module.exports = startBookingCleanup;
