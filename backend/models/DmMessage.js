const mongoose = require('mongoose');

const dmMessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: String, required: true },
  senderType: { type: String, enum: ['User', 'Bot'], default: 'User' },
  text: { type: String, default: '' },
  isEdited: { type: Boolean, default: false }
}, { timestamps: true });

dmMessageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('DmMessage', dmMessageSchema);