const mongoose = require('mongoose')

const cartSchema = new mongoose.Schema({
    user_id: {
    type: mongoose.Schema.Types.ObjectId
    ,
        required: true,
        ref:"user"
    },
    products: [
        {
            product_id: {
            type: mongoose.Schema.Types.ObjectId, 
            required: true,
            ref: "products"
            },
            quantity: {
                type: Number,
                required: true,
                default: 1
            },
            product_price: {
                type: Number,
                required: true
            },
            total_price: {
                type: Number,
                required: true
            }
        }
    ],
   
})

const cartModel = mongoose.model('cartModel', cartSchema)   

module.exports = cartModel