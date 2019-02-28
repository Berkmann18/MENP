const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');
const config = require('../config/config');
const Promise = require('promise');
// console.log('config.db=', config.db);
mongoose.connect(config.db, { useNewUrlParser: true }, (err) => {
  if (err) console.error('Mongoose: Error=', err);
});

let userSchema = new mongoose.Schema({
  title: { type: String, require: true },
  fname: { type: String, required: true },
  lname: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  registerDate: { type: Date, required: true },
  lastSeen: { type: Date },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  type: { type: String, default: 'member' },
  twoFA: { type: Boolean, required: true, default: false },
  twoFaMethod: String,
  phone: String,
  key: String,
  keyExpires: Date
});

userSchema.pre('save', function(next) {
  let user = this,
    SALT_FACTOR = 5;

  if (!user.isModified('password')) return next();

  bcrypt.genSalt(SALT_FACTOR, (err, salt) => {
    if (err) return next(err);

    bcrypt.hash(user.password, salt, null, (err, hash) => {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

userSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    if (err) {
      error('Password compare error', err);
      return cb(err);
    }
    cb(null, isMatch);
  });
};

mongoose.Promise = Promise;
let User = mongoose.model('User', userSchema);

module.exports = { User, userSchema };