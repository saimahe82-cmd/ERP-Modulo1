const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, roleMiddleware('faculty', 'hod'), userController.getUsers);
router.get('/by-email/:email', authMiddleware, userController.getUserByEmail);
router.get('/proctor/:email', authMiddleware, roleMiddleware('faculty', 'hod'), userController.getProctorForStudent);
router.get('/class-faculty/:email', authMiddleware, roleMiddleware('faculty', 'hod'), userController.getClassFacultyForStudent);
router.put('/:id', authMiddleware, roleMiddleware('faculty', 'hod'), userController.updateUser);
router.post('/link-student', authMiddleware, roleMiddleware('faculty', 'hod'), userController.linkStudentByEmail);
router.get('/students/:facultyEmail/:type', authMiddleware, roleMiddleware('faculty', 'hod'), userController.getStudentsForFaculty);

module.exports = router;
