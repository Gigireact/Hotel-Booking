const axios = require("axios");
const crypto = require("crypto");

const Payment = require("../models/payment.model");
const Booking = require("../models/booking.model");

const initializePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Please provide a booking ID",
      });
    }

    // Find the booking and make sure it belongs to this guest
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

    if (booking.bookingStatus !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "This booking is not awaiting payment",
      });
    }

    // Generate a unique payment reference
    const paymentReference = `PAY-${crypto.randomUUID()}`;

    // Paystack expects amounts in kobo, not naira
    const amountInKobo = Math.round(booking.totalAmount * 100);

    // Initialize transaction with Paystack
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: req.guest.email,
        amount: amountInKobo,
        reference: paymentReference,
        currency: "NGN",
        metadata: {
          bookingId: booking._id.toString(),
          guestId: req.guest._id.toString(),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Save payment record
    const payment = await Payment.create({
      booking: booking._id,
      guest: req.guest._id,
      amount: amountInKobo,
      currency: "NGN",
      paymentReference,
      paymentGateway: "Paystack",
      paymentStatus: "Pending",
    });

    return res.status(200).json({
      success: true,
      message: "Payment initialized successfully",
      authorizationUrl: response.data.data.authorization_url,
      accessCode: response.data.data.access_code,
      reference: paymentReference,
      payment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.response?.data?.message || error.message,
    });
  }
};

module.exports = {
  initializePayment,
};
