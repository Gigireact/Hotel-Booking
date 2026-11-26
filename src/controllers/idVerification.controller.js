
const mongoose = require("mongoose");
const Booking = require("../models/booking.model");
const Guest = require("../models/guest.model");
const { verifyId, warmUp } = require("../../idcheck-client");

// Wake up the ID verification service when the guest opens the verification page
const warmUpIdCheck = async (req, res) => {
  warmUp();

  return res.status(200).json({
    success: true,
    message: "ID verification service is warming up.",
  });
};

// Verify a guest's identity document
const verifyGuestId = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { idType } = req.body;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    const idTypeMapping = {
      passport: "PASSPORT",
      drivers_license: "DRIVERS_LICENSE",
      national_id: "NIN",
    };

    const normalizedIdType = idTypeMapping[idType];

    if (!normalizedIdType) {
      return res.status(400).json({
        success: false,
        message: "Please select a supported ID type.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an ID photo.",
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      guest: req.guest._id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (booking.idVerificationStatus === "Verified") {
        return res.status(409).json({
            success: false,
            message: "Your identity has already been verified.",
            idVerificationStatus: "Verified",
        });
    }

    if (
      !booking.idVerificationExpiresAt ||
      booking.idVerificationExpiresAt <= new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Your verification period has expired. Please create a new booking.",
      });
    }

    const guest = await Guest.findById(req.guest._id).select(
      "firstName lastName"
    );

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: "Guest account not found.",
      });
    }

    const guestName = `${guest.firstName} ${guest.lastName}`;

    const result = await verifyId({
      photoBuffer: req.file.buffer,
      idType: normalizedIdType,
      guestName,
    });

    if (
      !result ||
      !["Verified", "Rejected", "Needs review"].includes(result.result)
    ) {
      return res.status(503).json({
        success: false,
        message: "We could not complete ID verification. Please try again.",
      });
    }

    if (result.result === "Verified") {
      booking.idVerificationStatus = "Verified";
      booking.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await booking.save();

      return res.status(200).json({
        success: true,
        idVerificationStatus: "Verified",
        expiresAt: booking.expiresAt,
        message: result.message,
      });
    }

    booking.idVerificationStatus =
      result.result === "Needs review" ? "NeedsReview" : "Rejected";

    await booking.save();

    return res.status(200).json({
      success: true,
      idVerificationStatus: booking.idVerificationStatus,
      failureReason: result.failure_reason || null,
      message: result.message,
      processingTimeMs: result.processing_time_ms,
      canRetake: booking.idVerificationStatus === "Rejected",
    });
  } catch (error) {
    // Never log the uploaded photo, guest name, or request body
    console.error("ID verification error:", error.status || error.name);

    return res.status(503).json({
      success: false,
      message:
        "We could not check your ID right now. Please try again in a moment.",
    });
  }
};

module.exports = {
  warmUpIdCheck,
  verifyGuestId,
};
