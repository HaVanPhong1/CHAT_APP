const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    required: true,
    validate: v => v.length === 2
  },
  lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

conversationSchema.index({ participants: 1 });
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);