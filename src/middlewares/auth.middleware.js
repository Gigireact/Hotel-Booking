const jwt = require("jsonwebtoken");
const Guest = require("../models/guest.model");

const authenticateGuest = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const guest = await Guest.findById(decoded.id).select("-password");

    if (!guest) {
      return res.status(401).json({
        success: false,
        message: "Guest account not found.",
      });
    }

    req.guest = guest;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

module.exports = authenticateGuest;
