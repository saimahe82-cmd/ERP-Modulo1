const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, notificationController.getNotifications);
router.post('/', authMiddleware, notificationController.addNotification);
router.put('/:id/read', authMiddleware, notificationController.markRead);

module.exports = router;
