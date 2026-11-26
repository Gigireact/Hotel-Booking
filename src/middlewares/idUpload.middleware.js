
const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB maximum
    files: 1,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png"];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPEG and PNG images are allowed."));
    }

    cb(null, true);
  },
});

const uploadIdPhoto = (req, res, next) => {
  upload.single("photo")(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            success: false,
            message: "ID photo must not exceed 5MB.",
          });
        }
      }

      return res.status(400).json({
        success: false,
        message: error.message || "Unable to upload ID photo.",
      });
    }

    console.log("MULTER BODY:", req.body);
console.log("MULTER FILE RECEIVED:", !!req.file);

    next();
  });
};

module.exports = uploadIdPhoto;
