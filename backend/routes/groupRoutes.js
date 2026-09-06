const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.put('/:groupId', groupController.updateGroup);
router.post('/', groupController.createGroup);
router.get('/', groupController.getGroups);
router.post('/invite', groupController.inviteUser);
router.delete('/:groupId', groupController.deleteGroup);
router.post('/:groupId/leave', groupController.leaveGroup);
router.get('/:groupId/members', groupController.getGroupMembers);

module.exports = router;
