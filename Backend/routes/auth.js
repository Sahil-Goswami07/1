import express from 'express';
import { login, registerUniversityAdmin, publicUniversityApply } from '../controllers/authController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/register-university-admin', authenticate, authorize('superAdmin'), registerUniversityAdmin);
router.post('/university/apply', publicUniversityApply); // public self-service application

export default router;
