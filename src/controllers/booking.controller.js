const mongoose = require("mongoose");
const Booking = require("../models/booking.model");
const Room = require("../models/room.model");
const Hotel = require("../models/hotel.model");


const createBooking = async (req, res) => {
  let session;

  try {
    const {
      hotel,
      room,
      checkInDate,
      checkOutDate,
      numberOfGuests,
    } = req.body;

    if (
      !hotel ||
      !room ||
      !checkInDate ||
      !checkOutDate ||
      numberOfGuests === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required booking details",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(hotel) ||
      !mongoose.Types.ObjectId.isValid(room)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel or room ID",
      });
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (
      isNaN(checkIn.getTime()) ||
      isNaN(checkOut.getTime()) ||
      checkOut <= checkIn
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid check-in or check-out dates",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
      return res.status(400).json({
        success: false,
        message: "Check-in date cannot be in the past",
      });
    }

    const guests = Number(numberOfGuests);

    if (!Number.isInteger(guests) || guests < 1) {
      return res.status(400).json({
        success: false,
        message: "Number of guests must be a positive whole number",
      });
    }

    const millisecondsPerDay = 1000 * 60 * 60 * 24;

    const numberOfNights = Math.ceil(
      (checkOut - checkIn) / millisecondsPerDay
    );

    session = await mongoose.startSession();

    let booking;

    await session.withTransaction(async () => {
      // Confirm that the hotel exists
      const existingHotel = await Hotel.findById(hotel).session(session);

      if (!existingHotel) {
        const error = new Error("Hotel not found");
        error.bookingError = "HOTEL_NOT_FOUND";
        throw error;
      }

      // Atomically update the room to prevent concurrent booking checks
      const existingRoom = await Room.findOneAndUpdate(
        {
          _id: room,
          hotel,
          isAvailable: true,
        },
        {
          $inc: { bookingVersion: 1 },
        },
        {
          new: true,
          session,
        }
      );

      if (!existingRoom) {
        const error = new Error("Room not found or unavailable");
        error.bookingError = "ROOM_UNAVAILABLE";
        throw error;
      }

      if (guests > existingRoom.capacity) {
        const error = new Error("Number of guests exceeds room capacity");
        error.bookingError = "CAPACITY_EXCEEDED";
        throw error;
      }

      // Cancel expired pending bookings for this room
      await Booking.updateMany(
        {
          room,
          bookingStatus: "Pending",
          $or: [
            { expiresAt: { $lte: new Date() } },
            { expiresAt: null },
          ],
        },
        {
          $set: { bookingStatus: "Cancelled" },
        },
        { session }
      );

      // Check for overlapping bookings
      const conflictingBooking = await Booking.findOne({
        room,
        bookingStatus: { $in: ["Pending", "Confirmed"] },
        checkInDate: { $lt: checkOut },
        checkOutDate: { $gt: checkIn },
      }).session(session);

      if (conflictingBooking) {
        const error = new Error("Room already booked for these dates");
        error.bookingError = "DATES_UNAVAILABLE";
        throw error;
      }

      const totalAmount =
        existingRoom.pricePerNight * numberOfNights;

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      const createdBookings = await Booking.create(
        [
          {
            guest: req.guest._id,
            hotel,
            room,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            numberOfGuests: guests,
            numberOfNights,
            totalAmount,
            bookingStatus: "Pending",
            expiresAt,
          },
        ],
        { session }
      );

      booking = createdBookings[0];
    });

    return res.status(201).json({
      success: true,
      message: "Booking created successfully. Please proceed to payment.",
      booking,
    });

  } catch (error) {
    console.error("Create booking error:", error);

    const bookingErrors = {
      HOTEL_NOT_FOUND: [404, "Hotel not found"],
      ROOM_UNAVAILABLE: [404, "Room not found or unavailable"],
      CAPACITY_EXCEEDED: [400, "Number of guests exceeds room capacity"],
      DATES_UNAVAILABLE: [
        409,
        "This room is already booked for the selected dates",
      ],
    };

    const knownError = bookingErrors[error.bookingError];

    if (knownError) {
      return res.status(knownError[0]).json({
        success: false,
        message: knownError[1],
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create booking. Please try again later.",
    });

  } finally {
    if (session) {
      await session.endSession();
    }
  }
};



// GET ALL BOOKINGS FOR THE LOGGED-IN GUEST
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      guest: req.guest._id,
    })
      .populate("hotel", "name city country")
      .populate("room", "roomNumber roomType pricePerNight")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
  console.error("Get bookings error:", error);

  return res.status(500).json({
    success: false,
    message: "Unable to retrieve bookings. Please try again later.",
  });
}
};


module.exports = {
  createBooking,
  getMyBookings,
};
