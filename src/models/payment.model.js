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

    authorizationUrl: {
      type: String,
    },

    accessCode: {
      type: String,
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

    reconciliationStatus: {
      type: String,
      enum: ["NotRequired", "NeedsReview", "Resolved"],
      default: "NotRequired",
    },

    reconciliationNote: {
      type: String,
    },

    paidAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

paymentSchema.index(
  { booking: 1 },
  {
    unique: true,
    partialFilterExpression: { paymentStatus: "Pending" },
  }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
