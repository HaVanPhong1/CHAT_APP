const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const Conversation = require('../models/Conversation');

exports.sendRequest = async (req, res) => {
  try {
    const me = req.user.id;
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: 'Thiếu username' });
    const target = await User.findOne({ username });
    if (!target) return res.status(404).json({ message: 'Người dùng không tồn tại' });
    if (target._id.toString() === me) return res.status(400).json({ message: 'Không thể gửi lời mời cho chính mình' });

    const existing = await FriendRequest.findOne({
      $or: [
        { from: me, to: target._id },
        { from: target._id, to: me }
      ]
    });
    if (existing) {
      if (existing.status === 'pending') return res.status(400).json({ message: 'Đã có lời mời đang chờ' });
      if (existing.status === 'accepted') return res.status(400).json({ message: 'Đã là bạn bè' });
    }

    const fr = await FriendRequest.create({ from: me, to: target._id });
    const reqWithFrom = await FriendRequest.findById(fr._id).populate('from', 'username avatar');
    const io = req.app.get('io');
    if (io) {
      const sockets = io.userSockets?.get?.(target._id.toString());
      // direct via app reference
    }
    if (req.app.get('emitToUser')) req.app.get('emitToUser')(target._id.toString(), 'friend_request_incoming', reqWithFrom);
    res.json(reqWithFrom);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Đã có lời mời đang chờ' });
    res.status(500).json({ message: 'Lỗi gửi lời mời', error: err.message });
  }
};

exports.listIncoming = async (req, res) => {
  try {
    const me = req.user.id;
    const list = await FriendRequest.find({ to: me, status: 'pending' })
      .populate('from', 'username avatar')
      .sort('-createdAt');
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi', error: err.message });
  }
};

exports.listAccepted = async (req, res) => {
  try {
    const me = req.user.id;
    const list = await FriendRequest.find({
      $or: [{ from: me }, { to: me }],
      status: 'accepted'
    }).populate('from to', 'username avatar');
    const friends = list.map(fr => {
      const other = fr.from._id.toString() === me ? fr.to : fr.from;
      return { _id: other._id, username: other.username, avatar: other.avatar };
    });
    res.json(friends);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi', error: err.message });
  }
};

exports.respond = async (req, res) => {
  try {
    const me = req.user.id;
    const { id } = req.params;
    const { action } = req.body;
    if (!['accept', 'reject'].includes(action)) return res.status(400).json({ message: 'Action không hợp lệ' });

    const fr = await FriendRequest.findById(id);
    if (!fr) return res.status(404).json({ message: 'Lời mời không tồn tại' });
    if (fr.to.toString() !== me) return res.status(403).json({ message: 'Không có quyền' });
    if (fr.status !== 'pending') return res.status(400).json({ message: 'Lời mời đã xử lý' });

    fr.status = action === 'accept' ? 'accepted' : 'rejected';
    await fr.save();

    let conversation = null;
    if (action === 'accept') {
      const participants = [fr.from, fr.to].sort();
      conversation = await Conversation.findOne({ participants: { $all: participants, $size: 2 } });
      if (!conversation) conversation = await Conversation.create({ participants });
    }

    const fromUser = await User.findById(fr.from, 'username avatar');
    const toUser = await User.findById(fr.to, 'username avatar');
    res.json({
      friendRequest: fr,
      conversation: conversation ? {
        _id: conversation._id,
        other: { _id: toUser._id, username: toUser.username, avatar: toUser.avatar }
      } : null,
      friend: { _id: fromUser._id, username: fromUser.username, avatar: fromUser.avatar }
    });
    if (req.app.get('emitToUser')) req.app.get('emitToUser')(fr.from.toString(), 'friend_request_resolved', { id: fr._id, action });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi', error: err.message });
  }
};