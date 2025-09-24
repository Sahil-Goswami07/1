// backend/routes/verify.js
import express from 'express';
import fileUpload from 'express-fileupload';
import fs from 'fs/promises';
import { runOCR } from '../services/ocr.js';
import { extractMetadata } from '../services/metadata.js';
import { anomalyCheck } from '../services/anomaly.js';

const router = express.Router();

// Middleware for file upload
router.use(fileUpload({
  useTempFiles: true,
  tempFileDir: './tmp',
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
}));

router.post('/verify', async (req, res) => {
  if (!req.files || !req.files.certificate) {
    return res.status(400).json({ error: 'No certificate uploaded' });
  }

  const file = req.files.certificate;

  try {
    // Step 1: OCR extraction
    const extracted = await runOCR(file);

    // Step 2: Metadata extraction
    const metadata = await extractMetadata(file);

    // Step 3: Anomaly scoring
    const anomaly = await anomalyCheck(extracted, metadata);

    res.json({
      success: true,
      extracted,
      metadata,
      anomaly
    });
  } catch (err) {
    console.error('Verification Error:', err);
    res.status(500).json({ error: 'Verification failed', details: err.message });
  } finally {
    // Cleanup temporary file
    if (file.tempFilePath) {
      await fs.unlink(file.tempFilePath).catch(() => {});
    }
  }
});

export default router;
