const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { uploadOdProof, uploadMedicalCertificate, handleUploadError } = require('../middleware/upload');

router.post('/', authMiddleware, leaveController.addRequest);
router.get('/all', authMiddleware, roleMiddleware('faculty', 'hod'), leaveController.getAllRequests);
router.get('/my', authMiddleware, leaveController.getRequestsByStudent);
router.get('/my/stats', authMiddleware, leaveController.getMyStats);
router.get('/pending/faculty', authMiddleware, roleMiddleware('faculty'), leaveController.getPendingFacultyRequests);
router.get('/pending/hod', authMiddleware, roleMiddleware('hod'), leaveController.getPendingHodRequests);
router.get('/overdue-od-proofs', authMiddleware, roleMiddleware('faculty', 'hod'), leaveController.getOverdueOdProofs);
router.get('/faculty-list', authMiddleware, roleMiddleware('hod'), leaveController.getFacultyList);
router.post('/:id/faculty-approve-local', authMiddleware, roleMiddleware('faculty'), leaveController.facultyApproveLocal);
router.post('/:id/faculty-forward-to-hod', authMiddleware, roleMiddleware('faculty'), leaveController.facultyForwardToHod);
router.post('/:id/faculty-reject', authMiddleware, roleMiddleware('faculty'), leaveController.facultyReject);
router.post('/:id/hod-action', authMiddleware, roleMiddleware('hod'), leaveController.hodAction);
router.post('/:id/checker-action', authMiddleware, roleMiddleware('od_checker'), leaveController.checkerAction);
router.post('/:id/upload-od-proof', authMiddleware, uploadOdProof, handleUploadError, leaveController.uploadOdProof);
router.post('/:id/upload-medical-certificate', authMiddleware, uploadMedicalCertificate, handleUploadError, leaveController.uploadMedicalCertificate);
router.delete('/:id', authMiddleware, leaveController.deleteRequest);

module.exports = router;
