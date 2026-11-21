
const Guest = require("../models/guest.model");

// GET GUEST PROFILE
const getGuestProfile = async (req, res) => {
  try {
    const guest = await Guest.findById(req.guest._id).select("-password");

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: "Guest not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Guest profile retrieved successfully",
      guest,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET GUEST LOYALTY POINTS
const getLoyaltyPoints = async (req, res) => {
  try {
    const guest = await Guest.findById(req.guest._id).select(
      "firstName lastName loyaltyPoints loyaltyTier"
    );

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: "Guest not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Loyalty points retrieved successfully",
      rewards: {
        guestName: `${guest.firstName} ${guest.lastName}`,
        loyaltyPoints: guest.loyaltyPoints,
        loyaltyTier: guest.loyaltyTier,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve loyalty points",
    });
  }
};

module.exports = {
  getGuestProfile,
  getLoyaltyPoints,
};
