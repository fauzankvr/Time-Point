const mongoos= require ('mongoose') 
const {v4:uuidv4} = require('uuid')

const userSchema = new mongoos.Schema({
  name: { type: String, require: true },
  email: { type: String, require: true, unique: true },
  password: { type: String ,require: true},
  googleId: { type: String, unique: true },
  phone: { type: String},
  profile: { type: String },  
  is_block: { type: Boolean, default: false },
  is_admin: { type: Boolean, default: false },
  referrel_code: { type: String },
  referrel: { type: String },
  wallet: { type: Number, default: 0 },
  wallet_history: [{
    date: {type: Date},
    amount: { type: Number },
    description: { type: String },
    transactionType: { type: String }
  }],
},
  {timestamps:true}
);

userSchema.pre('save', function (next) {
  if (!this.referrel_code) { 
    this.referrel_code = uuidv4();
  }
  next()
})

const users = mongoos.model('users', userSchema)

module.exports = users;   