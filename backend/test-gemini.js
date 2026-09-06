require('dotenv').config();
const { askGemini } = require('./services/aiService');

(async () => {
  try {
    const r = await askGemini('xin chào, bạn tên gì?', 'test-group-id');
    console.log('OK:', r);
  } catch (e) {
    console.error('FAIL:', e.message);
    console.error('Full:', JSON.stringify(e, null, 2));
  }
})();