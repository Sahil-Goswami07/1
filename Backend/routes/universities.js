import express from 'express';
import { listUniversities, approveUniversity, deleteUniversity, analytics } from '../controllers/universityController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', authenticate, authorize('superAdmin'), listUniversities);
router.post('/:id/approve', authenticate, authorize('superAdmin'), approveUniversity);
router.delete('/:id', authenticate, authorize('superAdmin'), deleteUniversity);
router.get('/analytics/summary', authenticate, authorize('superAdmin'), analytics);

export default router;
