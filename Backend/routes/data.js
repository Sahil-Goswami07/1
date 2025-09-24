import express from 'express';
import { excelUploadMiddleware, importUniversityData } from '../controllers/dataController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/excel', authenticate, authorize('universityAdmin'), excelUploadMiddleware, importUniversityData);

export default router;
