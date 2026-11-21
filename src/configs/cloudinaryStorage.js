
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "hotel-booking/rooms",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "avif", "gif", ],
    transformation: [
      { width: 1200, height: 800, crop: "limit" },
    ],
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per image
  },
});

module.exports = upload;
