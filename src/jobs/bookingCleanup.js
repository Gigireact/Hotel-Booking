
const cron = require("node-cron");
const Booking = require("../models/booking.model");

const startBookingCleanup = () => {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      const result = await Booking.updateMany(
        {
          bookingStatus: "Pending",
          $or: [
            // ID verification deadline expired
            {
              idVerificationStatus: {
                $in: ["Pending", "NeedsReview", "Rejected"],
              },
              idVerificationExpiresAt: { $lte: now },
            },

            // Payment deadline expired after verification
            {
              idVerificationStatus: "Verified",
              expiresAt: { $lte: now },
            },

            // Support older bookings without an ID status
            {
              idVerificationStatus: { $exists: false },
              expiresAt: { $lte: now },
            },
          ],
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
