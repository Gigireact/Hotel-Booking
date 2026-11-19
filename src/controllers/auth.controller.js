const Guest = require("../models/guest.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// REGISTER GUEST
const registerGuest = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, country } = req.body;

    // Check required fields
    if (!firstName || !lastName || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Check if guest already exists
    const existingGuest = await Guest.findOne({ email });

    if (existingGuest) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create guest
    const guest = await Guest.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      country,
    });

    // Generate JWT
    const token = jwt.sign(
      { id: guest._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      guest: {
        id: guest._id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        phone: guest.phone,
        loyaltyPoints: guest.loyaltyPoints,
        loyaltyTier: guest.loyaltyTier,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// LOGIN GUEST
const loginGuest = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide your email and password",
      });
    }

    // Find guest
    const guest = await Guest.findOne({ email });

    if (!guest) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(
      password,
      guest.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: guest._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      guest: {
        id: guest._id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        phone: guest.phone,
        loyaltyPoints: guest.loyaltyPoints,
        loyaltyTier: guest.loyaltyTier,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  registerGuest,
  loginGuest,
};
