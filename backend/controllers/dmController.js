const Conversation = require('../models/Conversation');
const User = require('../models/User');
const DmMessage = require('../models/DmMessage');

exports.listConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const convs = await Conversation.find({ participants: userId })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'username avatar');
    const result = convs.map(c => {
      const other = c.participants.find(p => p._id.toString() !== userId);
      return {
        _id: c._id,
        other: other ? { _id: other._id, username: other.username, avatar: other.avatar } : null,
        lastMessageAt: c.lastMessageAt
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi lấy danh sách chat', error: err.message });
  }
};

exports.startConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: 'Thiếu username' });
    if (username === req.user.username) {
      return res.status(400).json({ message: 'Không thể chat với chính mình' });
    }
    const other = await User.findOne({ username });
    if (!other) return res.status(404).json({ message: 'Người dùng không tồn tại' });

    const participants = [userId, other._id].sort();
    let conv = await Conversation.findOne({ participants: { $all: participants, $size: 2 } });
    if (!conv) {
      conv = await Conversation.create({ participants });
    }
    res.json({
      _id: conv._id,
      other: { _id: other._id, username: other.username, avatar: other.avatar },
      lastMessageAt: conv.lastMessageAt
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi tạo cuộc trò chuyện', error: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const conv = await Conversation.findById(conversationId);
    if (!conv) return res.status(404).json({ message: 'Cuộc trò chuyện không tồn tại' });
    if (!conv.participants.map(p => p.toString()).includes(userId)) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }
    const messages = await DmMessage.find({ conversationId }).sort({ createdAt: 1 }).limit(200).lean();
    const ids = [...new Set(messages.map(m => m.senderId.toString()))];
    const users = await User.find({ _id: { $in: ids } }, 'username');
    const nameMap = {};
    users.forEach(u => { nameMap[u._id.toString()] = u.username; });
    const result = messages.map(m => ({
      ...m,
      senderName: nameMap[m.senderId.toString()] || 'Không rõ'
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi lấy tin nhắn', error: err.message });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const conv = await Conversation.findById(conversationId);
    if (!conv) return res.status(404).json({ message: 'Cuộc trò chuyện không tồn tại' });
    if (!conv.participants.map(p => p.toString()).includes(userId)) {
      return res.status(403).json({ message: 'Không có quyền' });
    }
    await DmMessage.deleteMany({ conversationId });
    await Conversation.findByIdAndDelete(conversationId);
    res.json({ message: 'Đã xóa cuộc trò chuyện' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xóa cuộc trò chuyện', error: err.message });
  }
};

exports.getPeerSocket = async (req, res) => {
  try {
    const io = req.app.get('io');
    const userId = req.user.id;
    const { conversationId } = req.params;
    const conv = await Conversation.findById(conversationId);
    if (!conv) return res.status(404).json({ message: 'Không tìm thấy' });
    const otherId = conv.participants.find(p => p.toString() !== userId);
    if (!otherId) return res.status(404).json({ message: 'Không có đối phương' });

    const userSockets = req.app.get('userSockets') || {};
    const targetSockets = userSockets[otherId.toString()];
    console.log('[peer-socket] caller=', userId, 'target=', otherId.toString(), 'sockets=', targetSockets ? [...targetSockets].join(',') : 'none');

    if (!targetSockets || targetSockets.size === 0) {
      return res.status(404).json({ message: 'Đối phương không online' });
    }

    const targetSocketId = [...targetSockets][0];
    console.log('[peer-socket] found socketId=', targetSocketId);
    res.json({ socketId: targetSocketId });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi', error: err.message });
  }
};