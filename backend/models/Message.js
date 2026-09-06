const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  // senderId can be a User _id or a special string like 'bot'
  senderId: { type: String, required: true }, 
  senderType: { type: String, enum: ['User', 'Bot'], default: 'User' },
  text: { type: String },
  fileUrl: { type: String },
  fileType: { type: String, enum: ['image', 'audio', 'document', 'none'], default: 'none' },
  lang: { type: String, default: 'vi' },
  replyTo: {
    messageId: { type: String },
    senderName: { type: String },
    text: { type: String }
  },
  isEdited: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
