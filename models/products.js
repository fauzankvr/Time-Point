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
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  discription: { type: String, required: true },
  images: {
    image1: String,
    image2: String,
    image3: String,
    image4: String,
  },
  is_delete: { type: Boolean, default: false },
  is_list: { type: Boolean, default: false },
  discount_price: { type: Number, default: 0 },
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "offerModel",
  }
},{ timestamps: true });

const products = mongoose.model('products', productSchema)

module.exports = products