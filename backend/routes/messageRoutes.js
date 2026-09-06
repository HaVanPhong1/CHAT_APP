const express = require('express');
const router = express.Router();
const upload = require('../config/multerConfig');
const Message = require('../models/Message');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const path = require('path');

const handleUpload = async (req, res) => {
  try {
    const groupId = req.params.groupId || req.body.groupId;
    const senderId = req.user?.id || req.user?._id;
    const file = req.file;

    if (!file) return res.status(400).json({ message: 'Không có file nào được gửi.' });

    const ext = path.extname(file.originalname).toLowerCase();
    let fileType = 'document';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].includes(ext) || file.mimetype?.startsWith('image/')) {
      fileType = 'image';
    } else if (['.mp3', '.webm', '.ogg', '.wav', '.m4a', '.aac'].includes(ext) || file.mimetype?.startsWith('audio/')) {
      fileType = 'audio';
    }

    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    const message = new Message({
      groupId,
      senderId,
      fileUrl: `${baseUrl}/uploads/${file.filename}`,
      fileType,
      text: file.originalname
    });

    const savedMsg = await message.save();
    const user = await User.findById(senderId, 'username');
    const msgOut = {
      ...savedMsg.toObject(),
      senderName: user?.username || 'Thành viên'
    };

    // Broadcast through socket if available
    const io = req.app.get('io');
    if (io && groupId) {
      io.to(groupId.toString()).emit('receive_message', msgOut);
    }

    res.status(201).json(msgOut);
  } catch (err) {
    console.error('File upload route error:', err);
    res.status(500).json({ message: 'Lỗi upload file', error: err.message });
  }
};

router.post('/upload', authMiddleware, upload.single('file'), handleUpload);
router.post('/upload/:groupId', authMiddleware, upload.single('file'), handleUpload);

module.exports = router;
