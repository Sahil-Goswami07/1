import express from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { listLogs, stats, recentLogs } from '../controllers/logController.js';

const router = express.Router();
router.get('/', authenticate, authorize('universityAdmin','superAdmin'), listLogs);
router.get('/stats', authenticate, authorize('universityAdmin','superAdmin'), stats);
router.get('/recent', authenticate, authorize('universityAdmin','superAdmin'), recentLogs);
export default router;
