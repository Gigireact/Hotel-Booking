const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: true,
    },

    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },

    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },

    checkInDate: {
      type: Date,
      required: true,
    },

    checkOutDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > this.checkInDate;
        },
        message: "Check-out date must be after check-in date",
      },
    },

    numberOfGuests: {
      type: Number,
      required: true,
      min: 1,
    },

    numberOfNights: {
      type: Number,
      required: true,
      min: 1,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    bookingStatus: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled", "Completed"],
      default: "Pending",
    },

    idVerificationStatus: {
      type: String,
      enum: ["Pending", "Verified", "NeedsReview", "Rejected"],
      default: "Pending",
    },

    idVerificationExpiresAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    roomAccessCode: {
      type: String,
      select: false,
    },

    roomAccessCodeExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

bookingSchema.index(
  { roomAccessCode: 1 },
  {
    unique: true,
    partialFilterExpression: {
      roomAccessCode: { $type: "string" },
    },
  }
);

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
