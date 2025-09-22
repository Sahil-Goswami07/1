import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { runVerification } from '../../services/verification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../../uploads');
const upload = multer({ dest: UPLOADS_DIR });
const router = Router();

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const result = await runVerification({ filePath: path.resolve(req.file.path) });
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Verification failed', details: e.message });
  }
});

export default router;
