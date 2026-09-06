const express = require('express');
const router = express.Router();
const dm = require('../controllers/dmController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', dm.listConversations);
router.post('/start', dm.startConversation);
router.get('/:conversationId/messages', dm.getMessages);
router.delete('/:conversationId', dm.deleteConversation);
router.get('/:conversationId/peer-socket', dm.getPeerSocket);

module.exports = router;