const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    const users = await User.find(
      { username: { $regex: q, $options: 'i' } },
      'username avatar'
    ).limit(10);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
