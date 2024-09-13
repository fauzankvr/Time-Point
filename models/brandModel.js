const mongoose = require('mongoose')

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required:true
    },
    is_delete: {
        type: Boolean,
        default: false
    }
})


const brandModel = mongoose.model('brandModel', brandSchema)

module.exports = brandModel