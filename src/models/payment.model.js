const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    currency: {
      type: String,
      default: "NGN",
    },

    paymentReference: {
      type: String,
      required: true,
      unique: true,
    },

    paymentGateway: {
      type: String,
      default: "Paystack",
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Successful", "Failed", "Refunded"],
      default: "Pending",
    },

    paidAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
