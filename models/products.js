const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
  product_name: { type: String, required: true },
  brand_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "brandModel",
    requierd: true,
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "categoryModel",
    required: true,
  },
  gender: String,
  color: String,
  price: { type: String, required: true },
  stock: { type: Number, required: true },
  discription: { type: String, required: true },
  images: {
    image1: String,
    image2: String,
    image3: String,
    image4: String,
  },
  is_delete: { type: Boolean, default: false },
});

const products = mongoose.model('products', productSchema)

module.exports = products