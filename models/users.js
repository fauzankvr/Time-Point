const mongoos= require('mongoose')

const userSchema = new mongoos.Schema({
  name: { type: String, require: false },
  email: { type: String, require: true, unique: true },
  password: { type: String, require: false },
  googleId: { type: String, unique: true },
  phone: { type: String},
  profile: { type: String },  
  is_block: { type: Boolean, default: false },
  is_admin: { type: Boolean, default: false }
});

const users = mongoos.model('users', userSchema)

module.exports = users;   