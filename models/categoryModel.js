const mongoose = require('mongoose')

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'offerModel', 
  },
  is_delete: { type: Boolean, default: false },
});

const categoryModel = mongoose.model('categoryModel', categorySchema)

module.exports = categoryModel