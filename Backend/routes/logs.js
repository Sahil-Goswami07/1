import express from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { listLogs, stats, recentLogs, exportAnomaliesCsv } from '../controllers/logController.js';

const router = express.Router();
router.get('/', authenticate, authorize('universityAdmin','superAdmin'), listLogs);
router.get('/stats', authenticate, authorize('universityAdmin','superAdmin'), stats);
router.get('/recent', authenticate, authorize('universityAdmin','superAdmin'), recentLogs);
router.get('/export/anomalies.csv', authenticate, authorize('universityAdmin','superAdmin'), exportAnomaliesCsv);
export default router;
