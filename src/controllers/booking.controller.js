const Booking = require("../models/booking.model");
const Room = require("../models/room.model");
const Hotel = require("../models/hotel.model");

// CREATE BOOKING
const createBooking = async (req, res) => {
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

    if (!Number.isInteger(Number(numberOfGuests)) || Number(numberOfGuests) < 1) {
      return res.status(400).json({
        success: false,
        message: "Number of guests must be a positive whole number",
      });
    }

    const existingHotel = await Hotel.findById(hotel);

    if (!existingHotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    const existingRoom = await Room.findOne({
      _id: room,
      hotel,
      isAvailable: true,
    });

    if (!existingRoom) {
      return res.status(404).json({
        success: false,
        message: "Room not found or unavailable",
      });
    }

    if (Number(numberOfGuests) > existingRoom.capacity) {
      return res.status(400).json({
        success: false,
        message: "Number of guests exceeds room capacity",
      });
    }

    // Check for overlapping bookings
    const conflictingBooking = await Booking.findOne({
      room,
      bookingStatus: { $in: ["Pending", "Confirmed"] },
      checkInDate: { $lt: checkOut },
      checkOutDate: { $gt: checkIn },
    });

    if (conflictingBooking) {
      return res.status(409).json({
        success: false,
        message: "This room is already booked for the selected dates",
      });
    }

    // Calculate number of nights
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const numberOfNights = Math.ceil(
      (checkOut - checkIn) / millisecondsPerDay
    );

    // Calculate total amount in Naira
    const totalAmount = existingRoom.pricePerNight * numberOfNights;

    const booking = await Booking.create({
      guest: req.guest._id,
      hotel,
      room,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: Number(numberOfGuests),
      numberOfNights,
      totalAmount,
      bookingStatus: "Pending",
    });

    return res.status(201).json({
      success: true,
      message: "Booking created successfully. Please proceed to payment.",
      booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
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
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


module.exports = {
  createBooking,
  getMyBookings,
};
