const mongoose = require('mongoose')

const couponSchema = new mongoose.Schema({
    coupon_code: {
        type: String,
        required: true
    },
    discount: {
        type: Number,
        required: true
    },
    start_date: {
        type: Date,
        required: true
    },
    expiry_date: {
        type: Date,
        required: true
    },
    users: {
        type: Array,
        ref: "users"
    },
    minimum_amount: {
        type: Number, 
    }
    
})

const couponModel = mongoose.model("couponModel", couponSchema)

module.exports = couponModel