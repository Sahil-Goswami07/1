import express from 'express';
import { excelUploadMiddleware, importUniversityData, exportTemplate } from '../controllers/dataController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/excel', authenticate, authorize('universityAdmin'), excelUploadMiddleware, importUniversityData);
router.get('/template', authenticate, authorize('universityAdmin'), exportTemplate);

export default router;
