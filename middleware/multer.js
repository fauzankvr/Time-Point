const multer = require('multer')
const path = require('path')

// Define storage for uploaded files
const fileStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, "public/productImgs/"); // Destination folder for uploaded files
  },
  filename: (req, file, callback) => {
    callback(null, Date.now() + "-" + file.originalname); 
  },
});

// Initialize Multer with the storage configuration
exports.upload = multer({storage:fileStorage})