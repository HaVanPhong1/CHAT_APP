const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  settings: {
    fontSize: { type: String, default: '15px' },
    themeColor: { type: String, default: '#2563eb' }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
