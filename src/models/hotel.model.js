const mongoose = require("mongoose");

const guestSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    country: {
      type: String,
      trim: true,
    },

    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },

    loyaltyTier: {
      type: String,
      enum: ["Standard", "Silver", "Gold", "Platinum"],
      default: "Standard",
    },
  },
  { timestamps: true }
);

const Guest = mongoose.model("Guest", guestSchema);

module.exports = Guest;
