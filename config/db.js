const mongoose = require("mongoose");
require ("dotenv").config();

const connectDb = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err.message);
  }
};

module.exports = connectDb;
