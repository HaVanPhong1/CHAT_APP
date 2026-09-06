const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: "Tên đăng nhập đã tồn tại." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: "Đăng ký thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Mật khẩu không đúng." });

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
    
    res.json({
      token,
      user: { id: user._id, username: user.username, settings: user.settings, avatar: user.avatar }
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
