const mongoose = require('mongoose')

const wishlistSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "products",
    required: true,
  }]
});

const wishlistModel = mongoose.model('wishlistModel', wishlistSchema)

module.exports = wishlistModel