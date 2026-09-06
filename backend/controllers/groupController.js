const Group = require('../models/Group');
const User = require('../models/User');

exports.createGroup = async (req, res) => {
  try {
    const { name } = req.body;
    const ownerId = req.user.id;

    const newGroup = new Group({
      name,
      ownerId,
      members: [ownerId] // Owner is automatically a member
    });

    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (err) {
    res.status(500).json({ message: "Lỗi tạo nhóm", error: err.message });
  }
};

exports.getGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    // Find groups where this user is a member
    const groups = await Group.find({ members: userId }).populate('members', 'username avatar');
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy danh sách nhóm", error: err.message });
  }
};

exports.inviteUser = async (req, res) => {
  try {
    const { groupId, usernameToInvite } = req.body;
    const ownerId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Nhóm không tồn tại." });

    if (group.ownerId.toString() !== ownerId) {
      return res.status(403).json({ message: "Chỉ chủ nhóm mới có thể mời người mới." });
    }

    const userToInvite = await User.findOne({ username: usernameToInvite });
    if (!userToInvite) return res.status(404).json({ message: "Người dùng không tồn tại." });

    if (group.members.includes(userToInvite._id)) {
      return res.status(400).json({ message: "Người dùng đã ở trong nhóm." });
    }

    group.members.push(userToInvite._id);
    await group.save();

    res.json({ message: "Mời thành công", group });
  } catch (err) {
    res.status(500).json({ message: "Lỗi mời người dùng", error: err.message });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Nhóm không tồn tại' });
    if (group.ownerId.toString() !== userId) {
      return res.status(403).json({ message: 'Chỉ chủ nhóm mới có thể xóa nhóm' });
    }
    const Message = require('../models/Message');
    await Message.deleteMany({ groupId });
    await Group.findByIdAndDelete(groupId);
    res.json({ message: 'Đã xóa nhóm' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xóa nhóm', error: err.message });
  }
};

exports.leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Nhóm không tồn tại' });
    if (group.ownerId.toString() === userId) {
      return res.status(400).json({ message: 'Chủ nhóm không thể rời, hãy xóa nhóm' });
    }
    group.members = group.members.filter(m => m.toString() !== userId);
    await group.save();
    res.json({ message: 'Đã rời nhóm' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi rời nhóm', error: err.message });
  }
};

exports.updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name } = req.body;
    const userId = req.user.id;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Nhóm không tồn tại' });
    if (group.ownerId.toString() !== userId) {
      return res.status(403).json({ message: 'Chỉ chủ nhóm mới có thể đổi tên nhóm' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Tên nhóm không được để trống' });
    }
    group.name = name.trim();
    await group.save();
    res.json({ message: 'Đã đổi tên nhóm', group });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi đổi tên nhóm', error: err.message });
  }
};

exports.getGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId).populate('members', 'username avatar');
    if (!group) return res.status(404).json({ message: 'Nhóm không tồn tại' });
    res.json({ members: group.members });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi lấy danh sách thành viên', error: err.message });
  }
};
