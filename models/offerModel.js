const mongoose = require('mongoose')

const offerSchema = new mongoose.Schema({
    offer_name: { type: String, required: true },
    offer_percentage: { type: Number, required: true },
    offer_start_date: { type: Date, required: true },
    offer_end_date: { type: Date, required: true },
    is_delete: { type: Boolean, default: false },
});

const offerModel = mongoose.model("offerModel", offerSchema)

module.exports = offerModel