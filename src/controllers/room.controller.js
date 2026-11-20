const Room = require("../models/room.model");
const Hotel = require("../models/hotel.model");

// CREATE ROOM
const createRoom = async (req, res) => {
  try {
    const {
      hotel,
      roomNumber,
      roomType,
      description,
      pricePerNight,
      capacity,
      amenities,
      images,
    } = req.body;

    if (
      !hotel ||
      !roomNumber ||
      !roomType ||
      !description ||
      pricePerNight === undefined ||
      capacity === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required room details",
      });
    }

    // Check that the hotel exists
    const existingHotel = await Hotel.findById(hotel);

    if (!existingHotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    // Prevent duplicate room numbers within the same hotel
    const existingRoom = await Room.findOne({ hotel, roomNumber });

    if (existingRoom) {
      return res.status(409).json({
        success: false,
        message: "This room number already exists in this hotel",
      });
    }

    const room = await Room.create({
      hotel,
      roomNumber,
      roomType,
      description,
      pricePerNight,
      capacity,
      amenities,
      images,
    });

    return res.status(201).json({
      success: true,
      message: "Room created successfully",
      room,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL ROOMS IN A HOTEL
const getHotelRooms = async (req, res) => {
  try {
    const { hotelId } = req.params;

    const hotel = await Hotel.findById(hotelId);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    const rooms = await Room.find({
      hotel: hotelId,
      isAvailable: true,
    });

    return res.status(200).json({
      success: true,
      count: rooms.length,
      rooms,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const checkRoomAvailability = async (req, res) => {
  try {
    const { checkInDate, checkOutDate } = req.query;
    const { hotelId } = req.params;

    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide check-in and check-out dates",
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
        message: "Please provide valid dates. Check-out must be after check-in.",
      });
    }

    const hotel = await Hotel.findById(hotelId);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    const Booking = require("../models/booking.model");

    // Find rooms already booked during the requested dates
    const conflictingBookings = await Booking.find({
      hotel: hotelId,
      bookingStatus: { $in: ["Pending", "Confirmed"] },
      checkInDate: { $lt: checkOut },
      checkOutDate: { $gt: checkIn },
    }).select("room");

    const bookedRoomIds = conflictingBookings.map(
      (booking) => booking.room
    );

    // Return rooms that are not booked during those dates
    const availableRooms = await Room.find({
      hotel: hotelId,
      isAvailable: true,
      _id: { $nin: bookedRoomIds },
    });

    return res.status(200).json({
      success: true,
      count: availableRooms.length,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      availableRooms,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


module.exports = {
  createRoom,
  getHotelRooms,
  checkRoomAvailability,
};
