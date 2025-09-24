import express from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { listLogs } from '../controllers/logController.js';

const router = express.Router();
router.get('/', authenticate, authorize('universityAdmin','superAdmin'), listLogs);
export default router;
