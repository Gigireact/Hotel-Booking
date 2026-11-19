const Hotel = require("../models/hotel.model");

const getAllHotels = async (req, res) => {
  try {
    const { city, search } = req.query;

    const filter = {
      isActive: true,
    };

    if (city) {
      filter.city = { $regex: city, $options: "i" };
    }

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const hotels = await Hotel.find(filter);

    return res.status(200).json({
      success: true,
      count: hotels.length,
      hotels,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getHotelById = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({
      _id: req.params.id,
      isActive: true,
    });

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    return res.status(200).json({
      success: true,
      hotel,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// CREATE HOTEL
const createHotel = async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      city,
      state,
      country,
      phone,
      email,
      amenities,
      images,
    } = req.body;

    if (
      !name ||
      !description ||
      !address ||
      !city ||
      !state ||
      !country ||
      !phone
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required hotel details",
      });
    }

    const hotel = await Hotel.create({
      name,
      description,
      address,
      city,
      state,
      country,
      phone,
      email,
      amenities,
      images,
    });

    return res.status(201).json({
      success: true,
      message: "Hotel created successfully",
      hotel,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


module.exports = {
    createHotel,
    getAllHotels,
    getHotelById,
};
