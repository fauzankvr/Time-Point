const mongoos= require ('mongoose') 

const userSchema = new mongoos.Schema({
  name: { type: String, require: true },
  email: { type: String, require: true, unique: true },
  password: { type: String ,require: true},
  googleId: { type: String, unique: true },
  phone: { type: String},
  profile: { type: String },  
  is_block: { type: Boolean, default: false },
  is_admin: { type: Boolean, default: false },
  wallet: { type: Number, default: 0 },
  wallet_history: [{
    date: {type: Date},
    amount: { type: Number },
    description: { type: String },
    transactioType: { type: String }
  }],
});

const users = mongoos.model('users', userSchema)

module.exports = users;   