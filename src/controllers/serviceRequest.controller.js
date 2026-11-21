
const ServiceRequest = require("../models/serviceRequest.model");
const Booking = require("../models/booking.model");

// CREATE SERVICE REQUEST
const createServiceRequest = async (req, res) => {
  try {
    const { bookingId, serviceType, description } = req.body;

    if (!bookingId || !serviceType || !description) {
      return res.status(400).json({
        success: false,
        message: "Please provide booking ID, service type and description",
      });
    }

    // Confirm that the booking belongs to the logged-in guest
    const booking = await Booking.findOne({
      _id: bookingId,
      guest: req.guest._id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.bookingStatus !== "Confirmed") {
      return res.status(400).json({
        success: false,
        message: "Service requests are only available for confirmed bookings",
      });
    }

    const serviceRequest = await ServiceRequest.create({
      guest: req.guest._id,
      booking: booking._id,
      serviceType,
      description,
    });

    return res.status(201).json({
      success: true,
      message: "Service request submitted successfully",
      serviceRequest,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to create service request",
    });
  }
};

// GET MY SERVICE REQUESTS
const getMyServiceRequests = async (req, res) => {
  try {
    const requests = await ServiceRequest.find({
      guest: req.guest._id,
    })
      .populate("booking", "checkInDate checkOutDate bookingStatus")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve service requests",
    });
  }
};

module.exports = {
  createServiceRequest,
  getMyServiceRequests,
};
