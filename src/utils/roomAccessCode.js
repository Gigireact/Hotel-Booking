
const crypto = require("crypto");
const Booking = require("../models/booking.model");

const generateRoomAccessCode = () => {
  return String(crypto.randomInt(1000000000, 9999999999));
};

const ensureRoomAccessCode = async (bookingId) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const booking = await Booking.findById(bookingId).select(
      "+roomAccessCode"
    );

    if (!booking) {
      throw new Error("Booking not found");
    }

    // Reuse the existing code instead of generating another one
    if (booking.roomAccessCode) {
      return booking;
    }

    try {
      const updatedBooking = await Booking.findOneAndUpdate(
        {
          _id: bookingId,
          $or: [
            { roomAccessCode: { $exists: false } },
            { roomAccessCode: null },
          ],
        },
        {
          $set: {
            roomAccessCode: generateRoomAccessCode(),
            roomAccessCodeExpiresAt: booking.checkOutDate,
          },
        },
        { new: true }
      ).select("+roomAccessCode");

      if (updatedBooking) {
        return updatedBooking;
      }
    } catch (error) {
      // Retry if the generated code already exists
      if (error.code !== 11000) {
        throw error;
      }
    }
  }

  throw new Error("Unable to generate a unique room access code");
};

module.exports = { ensureRoomAccessCode };
