const express = require('express');
const router = express.Router();
const friend = require('../controllers/friendController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/request', friend.sendRequest);
router.get('/requests', friend.listIncoming);
router.get('/list', friend.listAccepted);
router.post('/:id/respond', friend.respond);

module.exports = router;