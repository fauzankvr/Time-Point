const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userOtpSchema = new Schema({
  userId: String,
  otp: String,
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true},
});

userOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });  

const userOtp = mongoose.model('userOtp',userOtpSchema)

module.exports = userOtp;