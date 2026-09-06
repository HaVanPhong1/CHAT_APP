require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const dmRoutes = require('./routes/dmRoutes');
const friendRoutes = require('./routes/friendRoutes');
const messageRoutes = require('./routes/messageRoutes');
const Message = require('./models/Message');
const DmMessage = require('./models/DmMessage');
const Conversation = require('./models/Conversation');
const User = require('./models/User');
const { askGemini } = require('./services/aiService');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000'
];

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST']
  }
});

const connectedUsers = {};
const userSockets = {};

function emitToUser(userId, event, data) {
  const sockets = userSockets[userId];
  if (!sockets || sockets.size === 0) return false;
  for (const sid of sockets) io.to(sid).emit(event, data);
  return true;
}

app.set('io', io);
app.set('userSockets', userSockets);
app.set('emitToUser', emitToUser);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

// DB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aichat';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.log('❌ MongoDB error:', err));

// REST Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', messageRoutes);

// Get message history for a group
app.get(['/api/messages/:groupId', '/api/history/:groupId'], async (req, res) => {
  try {
    const messages = await Message.find({ groupId: req.params.groupId })
      .sort('createdAt').limit(100);
    const userIds = messages.filter(m => m.senderType === 'User').map(m => m.senderId);
    const users = await User.find({ _id: { $in: userIds } }, 'username');
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u.username; });

    const result = messages.map(m => {
      const obj = m.toObject();
      obj.senderName = m.senderType === 'Bot' ? 'AI Bot' : (userMap[m.senderId] || 'Thành viên');
      return obj;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resolve username -> userId (for client to start DM)
app.get('/api/users/lookup/:username', async (req, res) => {
  try {
    const u = await User.findOne({ username: req.params.username }, 'username avatar');
    if (!u) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json({ _id: u._id, username: u.username, avatar: u.avatar });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Socket.io
io.on('connection', (socket) => {
  const token = socket.handshake.auth?.token;
  let userInfo = null;
  try {
    if (token) {
      userInfo = jwt.verify(token, JWT_SECRET);
      connectedUsers[socket.id] = userInfo;
    }
  } catch(e) {}

  console.log(`🔌 Connected: ${userInfo?.username || socket.id}`);
  if (userInfo?.id) {
    if (!userSockets[userInfo.id]) userSockets[userInfo.id] = new Set();
    userSockets[userInfo.id].add(socket.id);
    socket.join(`user:${userInfo.id}`);
    socket.userId = userInfo.id;
    socket.username = userInfo.username;
    console.log('[socket] userId=', userInfo.id, 'sockets=', [...userSockets[userInfo.id]].join(','));
  }

  socket.on('join_group', (groupId) => {
    socket.join(groupId);
  });

  socket.on('join_dm', (conversationId) => {
    socket.join(`dm:${conversationId}`);
  });

  socket.on('send_dm', async ({ conversationId, text }) => {
    try {
      const sender = connectedUsers[socket.id];
      if (!sender) return;
      const conv = await Conversation.findById(conversationId);
      if (!conv) return;
      if (!conv.participants.map(p => p.toString()).includes(sender.id)) return;
      const trimmed = (text || '').trim();
      if (!trimmed) return;

      const doc = await DmMessage.create({
        conversationId,
        senderId: sender.id,
        senderType: 'User',
        text: trimmed
      });
      conv.lastMessageAt = doc.createdAt;
      await conv.save();
      const senderUser = await User.findById(sender.id, 'username');
      const out = {
        ...doc.toObject(),
        senderName: senderUser?.username || sender.username || 'Unknown',
        senderId: sender.id,
        conversationId
      };
      io.to(`dm:${conversationId}`).emit('receive_dm', out);

      if (/@ai\b/i.test(trimmed)) {
        const prompt = trimmed.replace(/@ai/ig, '').trim();
        if (!prompt) return;
        const tempId = `typing-dm-${Date.now()}`;
        io.to(`dm:${conversationId}`).emit('receive_dm', {
          _id: tempId,
          conversationId,
          senderId: 'bot',
          senderType: 'Bot',
          text: '',
          isTyping: true,
          createdAt: new Date().toISOString()
        });
        (async () => {
          try {
            const reply = await askGemini(prompt, conversationId, 'dm');
            const aiDoc = await DmMessage.create({
              conversationId,
              senderId: 'bot',
              senderType: 'Bot',
              text: reply || 'Xin lỗi, mình chưa có phản hồi.'
            });
            io.to(`dm:${conversationId}`).emit('receive_dm', {
              ...aiDoc.toObject(),
              senderName: 'AI Bot',
              senderId: 'bot',
              conversationId,
              replaceTempId: tempId
            });
          } catch (err) {
            console.error('AI DM error:', err.message);
            const errText = `⚠️ AI lỗi: ${err.message.slice(0, 200)}`;
            const aiDoc = await DmMessage.create({
              conversationId,
              senderId: 'bot',
              senderType: 'Bot',
              text: errText
            });
            io.to(`dm:${conversationId}`).emit('receive_dm', {
              ...aiDoc.toObject(),
              senderName: 'AI Bot',
              senderId: 'bot',
              conversationId,
              replaceTempId: tempId
            });
          }
        })();
      }
    } catch (err) {
      console.error('DM error:', err.message);
    }
  });

  socket.on('send_message', async (data) => {
    try {
      const sender = connectedUsers[socket.id];
      const senderId = sender?.id || data.senderId;
      const newMsg = new Message({
        groupId: data.groupId,
        senderId: senderId,
        text: data.text,
        lang: data.lang || 'vi',
        replyTo: data.replyTo || null
      });
      const savedMsg = await newMsg.save();
      const senderUser = sender?.id ? await User.findById(sender.id, 'username') : null;
      const msgOut = {
        ...savedMsg.toObject(),
        senderName: senderUser?.username || sender?.username || 'Unknown',
        replyTo: data.replyTo || null
      };
      io.to(data.groupId).emit('receive_message', msgOut);

      if (/@ai\b/i.test(data.text)) {
        const prompt = data.text.replace(/@ai/ig, '').trim();
        if (!prompt) return;
        const tempId = `typing-${Date.now()}`;
        io.to(data.groupId).emit('receive_message', {
          _id: tempId,
          groupId: data.groupId,
          senderId: 'bot',
          senderType: 'Bot',
          senderName: 'AI Bot',
          isTyping: true,
          createdAt: new Date().toISOString()
        });
        (async () => {
          try {
            const reply = await askGemini(prompt, data.groupId);
            const aiMsg = new Message({
              groupId: data.groupId,
              senderId: 'bot',
              senderType: 'Bot',
              text: reply || 'Xin lỗi, mình chưa có phản hồi.'
            });
            const savedAi = await aiMsg.save();
            io.to(data.groupId).emit('receive_message', {
              ...savedAi.toObject(),
              senderName: 'AI Bot',
              replaceTempId: tempId
            });
          } catch (err) {
            console.error('AI error:', err.message);
            const errText = `⚠️ AI lỗi: ${err.message.slice(0, 200)}`;
            const aiMsg = new Message({
              groupId: data.groupId,
              senderId: 'bot',
              senderType: 'Bot',
              text: errText
            });
            const savedAi = await aiMsg.save();
            io.to(data.groupId).emit('receive_message', {
              ...savedAi.toObject(),
              senderName: 'AI Bot',
              replaceTempId: tempId
            });
          }
        })();
      }
    } catch (err) {
      console.error('Message save error:', err);
    }
  });

  socket.on('edit_message', async ({ messageId, groupId, newText }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      msg.text = newText;
      msg.isEdited = true;
      await msg.save();
      io.to(groupId).emit('message_edited', { messageId, newText, isEdited: true });
    } catch (err) {
      console.error('Edit message error:', err);
    }
  });

  socket.on('delete_message', async ({ messageId, groupId }) => {
    try {
      await Message.findByIdAndDelete(messageId);
      io.to(groupId).emit('message_deleted', { messageId });
    } catch (err) {
      console.error('Delete message error:', err);
    }
  });

  socket.on('broadcast_file', async (msgData) => {
    try {
      const sender = connectedUsers[socket.id];
      if (sender?.id) {
        const u = await User.findById(sender.id, 'username');
        if (u) msgData.senderName = u.username;
      }
    } catch (e) {}
    io.to(msgData.groupId).emit('receive_message', msgData);
  });

  socket.on('get_online_members', (groupId, callback) => {
    const roomSockets = io.sockets.adapter.rooms.get(groupId);
    const online = [];
    if (roomSockets) {
      roomSockets.forEach(sid => {
        if (connectedUsers[sid]) online.push({ socketId: sid, ...connectedUsers[sid] });
      });
    }
    callback(online);
  });

  socket.on('disconnect', () => {
    delete connectedUsers[socket.id];
    if (userInfo?.id && userSockets[userInfo.id]) {
      userSockets[userInfo.id].delete(socket.id);
      if (userSockets[userInfo.id].size === 0) delete userSockets[userInfo.id];
    }
    console.log(`❌ Disconnected: ${userInfo?.username || socket.id}`);
  });
});

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend', 'dist');

if (process.env.NODE_ENV === 'production' || process.env.SERVE_FRONTEND === 'true') {
  app.use(express.static(FRONTEND_DIR));
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  });
}

server.listen(PORT, () => console.log(`🚀 Server running on http://0.0.0.0:${PORT}`));
