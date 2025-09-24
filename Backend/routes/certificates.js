import express from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { listCertificates } from '../controllers/certificateController.js';

const router = express.Router();

router.get('/', authenticate, authorize('universityAdmin','superAdmin'), listCertificates);

export default router;
