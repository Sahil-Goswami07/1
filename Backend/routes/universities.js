import express from 'express';
import { 
  listUniversities, 
  approveUniversity, 
  deleteUniversity, 
  analytics, 
  getUniversityProfile, 
  updateUniversityProfile 
} from '../controllers/universityController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

import fileUpload from 'express-fileupload';

const fileUploadMiddleware = fileUpload({
  useTempFiles: true,
  tempFileDir: './Backend/tmp',
  createParentPath: true,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.get('/profile', authenticate, authorize('universityAdmin'), getUniversityProfile);
router.put('/profile', authenticate, authorize('universityAdmin'), fileUploadMiddleware, updateUniversityProfile);

router.get('/', authenticate, authorize('superAdmin'), listUniversities);
router.post('/:id/approve', authenticate, authorize('superAdmin'), approveUniversity);
router.delete('/:id', authenticate, authorize('superAdmin'), deleteUniversity);
router.get('/analytics/summary', authenticate, authorize('superAdmin'), analytics);

export default router;
