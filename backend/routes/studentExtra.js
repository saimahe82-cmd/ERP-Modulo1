const express = require('express');
const router = express.Router();
const studentExtraController = require('../controllers/studentExtraController');
const { authMiddleware } = require('../middleware/auth');

router.get('/:email', authMiddleware, studentExtraController.getExtra);
router.put('/:email', authMiddleware, studentExtraController.updateExtra);

module.exports = router;
