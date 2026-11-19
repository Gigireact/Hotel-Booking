const Guest = require("../models/guest.model");

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

module.exports = {
  getGuestProfile,
};
