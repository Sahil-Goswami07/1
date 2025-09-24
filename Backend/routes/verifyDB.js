import express from 'express';
import { verifyCertificate, verifyFileMiddleware } from '../controllers/verifyController.js';

const router = express.Router();
router.post('/', verifyFileMiddleware, verifyCertificate);
export default router;
