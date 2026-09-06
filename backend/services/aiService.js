const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash';

let client = null;
function getModel() {
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY is not set. Add it to backend/.env');
  }
  if (!client) {
    client = new GoogleGenerativeAI(API_KEY);
  }
  return client.getGenerativeModel({
    model: MODEL,
    systemInstruction:
      'Bạn là AI Bot trong một ứng dụng chat nhóm. ' +
      'Trả lời ngắn gọn, thân thiện, bằng tiếng Việt trừ khi người dùng dùng ngôn ngữ khác. ' +
      'Không cần chào hỏi hay giới thiệu bản thân. ' +
      'Không bịa số liệu, nếu không chắc chắn thì nói rõ.'
  });
}

const MAX_HISTORY = 10;

async function loadHistory(groupId) {
  try {
    const Message = require('../models/Message');
    const docs = await Message.find({ groupId })
      .sort({ createdAt: -1 })
      .limit(MAX_HISTORY)
      .lean();
    const history = docs.reverse().map(m => {
      const role = m.senderType === 'Bot' ? 'model' : 'user';
      const text = m.text || '';
      const hasFile = m.fileType && m.fileType !== 'none';
      return { role, parts: [{ text: hasFile ? `[${m.senderType === 'Bot' ? 'AI' : 'User'} đã gửi file]` : text }] };
    }).filter(m => m.parts[0].text);
    while (history.length > 0 && history[0].role === 'model') {
      history.shift();
    }
    return history;
  } catch (e) {
    return [];
  }
}

async function loadDmHistory(conversationId) {
  try {
    const DmMessage = require('../models/DmMessage');
    const docs = await DmMessage.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(MAX_HISTORY)
      .lean();
    const history = docs.reverse().map(m => ({
      role: m.senderType === 'Bot' ? 'model' : 'user',
      parts: [{ text: m.text || '' }]
    })).filter(m => m.parts[0].text);
    while (history.length > 0 && history[0].role === 'model') {
      history.shift();
    }
    return history;
  } catch (e) {
    return [];
  }
}

async function askGemini(prompt, chatId, type = 'group') {
  const model = getModel();
  const history = type === 'dm' ? await loadDmHistory(chatId) : await loadHistory(chatId);
  const chat = model.startChat({ history });
  const result = await chat.sendMessage(prompt);
  const text = result.response.text();
  return (text || '').trim();
}

module.exports = { askGemini };
