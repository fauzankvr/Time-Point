const mongoose = require('mongoose')

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required:true
    }
})

const brandModel = mongoose.model('brandModel', brandSchema)

module.exports = brandModel